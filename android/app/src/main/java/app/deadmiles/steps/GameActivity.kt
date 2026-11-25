@file:OptIn(androidx.health.connect.client.feature.ExperimentalFeatureAvailabilityApi::class)

package app.deadmiles.steps

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.lifecycle.lifecycleScope
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * 2.0 (owner: "is there a way to make it so that people don't have to set up step sync ... can you do that for the
 * Android"): the app IS the game now. It opens Dead Miles in a full-screen web view. When the player signs in, the game
 * hands this app its account (window.DMAndroid.setAccount), and the app asks Health Connect for steps once and starts
 * the same hourly StepsWorker the old companion used - no handle or token to copy. The old setup screen
 * (MainActivity) is still there as "Step sync settings" for fixing things by hand.
 */
class GameActivity : AppCompatActivity() {

    companion object {
        const val GAME_URL = "https://celestenguyenn-design.github.io/dead-miles/next/"
        private const val HOST = "celestenguyenn-design.github.io"
    }

    private lateinit var web: WebView
    private val stepsPerm = HealthPermission.getReadPermission(StepsRecord::class)
    private val bgPerm = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
    private var permissions = setOf(stepsPerm)
    private var geoCallback: GeolocationPermissions.Callback? = null
    private var geoOrigin: String? = null

    private val requestSteps =
        registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
            if (granted.contains(stepsPerm)) {
                startSync()
                askBatteryOnce()
            }
            pushStatus()
        }

    private val requestLocation =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { res ->
            val ok = res.values.any { it }
            geoCallback?.invoke(geoOrigin, ok, false)
            geoCallback = null
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        web.setBackgroundColor(0xFF11142F.toInt())
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            setGeolocationEnabled(true)
            userAgentString = "$userAgentString DeadMilesAndroid/2"
        }
        web.addJavascriptInterface(Bridge(), "DMAndroid")
        web.webViewClient = object : WebViewClient() {
            // stay in the app for the game; anything else (store links, help pages) opens the browser
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                val u = req.url
                if (u.host == HOST && (u.scheme == "https" || u.scheme == "http") && !u.path.orEmpty().endsWith(".apk")) return false
                try { startActivity(Intent(Intent.ACTION_VIEW, u)) } catch (e: Exception) { /* nothing to open it */ }
                return true
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                val fine = ContextCompat.checkSelfPermission(this@GameActivity, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                if (fine) { callback.invoke(origin, true, false); return }
                geoOrigin = origin; geoCallback = callback
                requestLocation.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
            }
        }
        setContentView(web)
        if (savedInstanceState != null) web.restoreState(savedInstanceState) else web.loadUrl(GAME_URL)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else { isEnabled = false; onBackPressedDispatcher.onBackPressed() }
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) { super.onSaveInstanceState(outState); web.saveState(outState) }

    override fun onResume() {
        super.onResume()
        web.onResume()
        // every time the game comes back to the front, send today's steps right away
        if (Prefs(this).handle.isNotEmpty()) sendNow()
    }

    override fun onPause() { web.onPause(); super.onPause() }

    // ---------------------------------------------------------------- what the game can call
    inner class Bridge {
        /** The game signed in (or was already signed in): remember the account and connect steps if we can. */
        @JavascriptInterface
        fun setAccount(handle: String, token: String) {
            val h = handle.trim().lowercase(); val t = token.trim()
            if (h.isEmpty() || t.isEmpty()) return
            val p = Prefs(this@GameActivity)
            val changed = p.handle != h || p.token != t
            p.handle = h; p.token = t
            runOnUiThread { if (changed || !p.asked) connect(auto = true) else ensureRunning() }
        }

        /** The player tapped Connect my steps in the game. */
        @JavascriptInterface
        fun connectSteps() { runOnUiThread { connect(auto = false) } }

        @JavascriptInterface
        fun sendNow() { runOnUiThread { this@GameActivity.sendNow() } }

        @JavascriptInterface
        fun openSettings() { runOnUiThread { startActivity(Intent(this@GameActivity, MainActivity::class.java)) } }

        @JavascriptInterface
        fun status(): String = statusJson().toString()

        @JavascriptInterface
        fun version(): Int = 2
    }

    // ---------------------------------------------------------------- steps
    private fun connect(auto: Boolean) {
        val p = Prefs(this)
        when (HealthConnectClient.getSdkStatus(this)) {
            HealthConnectClient.SDK_UNAVAILABLE -> { pushStatus(); return }
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                if (!auto || !p.asked) {
                    p.asked = true
                    try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding"))) } catch (e: Exception) { }
                }
                pushStatus(); return
            }
            else -> {}
        }
        lifecycleScope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(this@GameActivity)
                permissions = if (bgSupported(client)) setOf(stepsPerm, bgPerm) else setOf(stepsPerm)
                val granted = client.permissionController.getGrantedPermissions()
                if (granted.containsAll(permissions)) { startSync(); if (!auto) askBatteryOnce(); pushStatus() }
                else if (!auto || !p.asked) { p.asked = true; requestSteps.launch(permissions) }
                else { if (granted.contains(stepsPerm)) startSync(); pushStatus() }
            } catch (e: Exception) { pushStatus() }
        }
    }

    private fun ensureRunning() {
        lifecycleScope.launch {
            try {
                if (HealthConnectClient.getSdkStatus(this@GameActivity) != HealthConnectClient.SDK_AVAILABLE) return@launch
                val g = HealthConnectClient.getOrCreate(this@GameActivity).permissionController.getGrantedPermissions()
                if (g.contains(stepsPerm)) startSync()
            } catch (e: Exception) { }
            pushStatus()
        }
    }

    private fun bgSupported(client: HealthConnectClient): Boolean = try {
        client.features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND) ==
            HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
    } catch (e: Throwable) { false }

    private fun startSync() {
        val periodic = PeriodicWorkRequestBuilder<StepsWorker>(1, TimeUnit.HOURS, 20, TimeUnit.MINUTES).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork("steps-sync", ExistingPeriodicWorkPolicy.UPDATE, periodic)
        sendNow()
    }

    private fun sendNow() {
        WorkManager.getInstance(this).enqueue(OneTimeWorkRequestBuilder<StepsWorker>().build())
        web.postDelayed({ pushStatus() }, 5000)
    }

    private fun askBatteryOnce() {
        val p = Prefs(this); if (p.askedBattery) return; p.askedBattery = true
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        if (pm.isIgnoringBatteryOptimizations(packageName)) return
        try { startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName"))) } catch (e: Exception) { }
    }

    private fun statusJson(): JSONObject {
        val p = Prefs(this)
        val sdk = HealthConnectClient.getSdkStatus(this)
        return JSONObject()
            .put("handle", p.handle)
            .put("health", when (sdk) { HealthConnectClient.SDK_AVAILABLE -> "ok"; HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "install"; else -> "none" })
            .put("lastSync", p.lastSync)
            .put("lastSteps", p.lastSteps)
            .put("error", p.lastError)
    }

    /** Tell the game what happened (it listens with window.dmAndroidStatus = fn). */
    private fun pushStatus() {
        lifecycleScope.launch {
            val j = statusJson()
            try {
                if (HealthConnectClient.getSdkStatus(this@GameActivity) == HealthConnectClient.SDK_AVAILABLE) {
                    val g = HealthConnectClient.getOrCreate(this@GameActivity).permissionController.getGrantedPermissions()
                    j.put("allowed", g.contains(stepsPerm))
                }
            } catch (e: Exception) { }
            web.evaluateJavascript("window.dmAndroidStatus && window.dmAndroidStatus($j)", null)
        }
    }
}
