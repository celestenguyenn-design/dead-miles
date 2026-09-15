package app.deadmiles.steps

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.lifecycle.lifecycleScope
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * One screen. Paste the handle and token from the game (Settings > Online), allow step access,
 * and the app posts today's Health Connect step total to the game's server every hour.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var status: TextView
    private lateinit var handleBox: EditText
    private lateinit var tokenBox: EditText
    private val permissions = setOf(HealthPermission.getReadPermission(StepsRecord::class))

    private val requestPermissions =
        registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
            if (granted.containsAll(permissions)) {
                setStatus("Step access allowed. Tap Save & start.")
            } else {
                setStatus("Step access was not allowed. The app cannot read steps without it.")
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = Prefs(this)
        val dp = resources.displayMetrics.density

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding((20 * dp).toInt(), (40 * dp).toInt(), (20 * dp).toInt(), (24 * dp).toInt())
        }
        fun label(text: String, size: Float = 14f, bold: Boolean = false): TextView = TextView(this).apply {
            this.text = text
            textSize = size
            if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(0, (8 * dp).toInt(), 0, (4 * dp).toInt())
        }
        fun button(text: String, onClick: () -> Unit): Button = Button(this).apply {
            this.text = text
            setOnClickListener { onClick() }
        }

        root.addView(label("Dead Miles Steps", 26f, true))
        root.addView(label("Sends today's step count from Health Connect to the game every hour. Nothing else. Fill this in once."))

        root.addView(label("1. Handle (from the game, Settings > Online)", bold = true))
        handleBox = EditText(this).apply { hint = "e.g. celeste"; setText(prefs.handle); inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS }
        root.addView(handleBox)

        root.addView(label("2. Token (from the game, under Phone shortcut)", bold = true))
        tokenBox = EditText(this).apply { hint = "long code"; setText(prefs.token); inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS }
        root.addView(tokenBox)

        root.addView(label("3. Allow step access", bold = true))
        root.addView(button("Allow reading steps") { askPermission() })

        root.addView(label("4. Start", bold = true))
        root.addView(button("Save & start hourly sync") {
            prefs.handle = handleBox.text.toString().trim().lowercase()
            prefs.token = tokenBox.text.toString().trim()
            if (prefs.handle.isEmpty() || prefs.token.isEmpty()) {
                setStatus("Handle and token are both needed.")
            } else {
                schedule()
                setStatus("Saved. First sync running now, then every hour in the background.")
            }
        })
        root.addView(button("Send now") {
            WorkManager.getInstance(this).enqueue(OneTimeWorkRequestBuilder<StepsWorker>().build())
            setStatus("Sending...")
            root.postDelayed({ refreshStatus() }, 4000)
        })

        status = TextView(this).apply { textSize = 14f; setPadding(0, (24 * dp).toInt(), 0, 0); gravity = Gravity.START }
        root.addView(status)

        setContentView(ScrollView(this).apply { addView(root) })
        checkAvailability()
        refreshStatus()
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
    }

    private fun checkAvailability() {
        when (HealthConnectClient.getSdkStatus(this)) {
            HealthConnectClient.SDK_UNAVAILABLE -> setStatus("Health Connect is not available on this phone.")
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                setStatus("Health Connect needs to be installed or updated. Opening the Play Store...")
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding")))
                } catch (e: Exception) { /* no store */ }
            }
            else -> {}
        }
    }

    private fun askPermission() {
        lifecycleScope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(this@MainActivity)
                val granted = client.permissionController.getGrantedPermissions()
                if (granted.containsAll(permissions)) setStatus("Step access is already allowed.")
                else requestPermissions.launch(permissions)
            } catch (e: Exception) {
                setStatus("Could not open Health Connect: ${e.message}")
            }
        }
    }

    private fun schedule() {
        val periodic = PeriodicWorkRequestBuilder<StepsWorker>(1, TimeUnit.HOURS, 20, TimeUnit.MINUTES).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork("steps-sync", ExistingPeriodicWorkPolicy.UPDATE, periodic)
        WorkManager.getInstance(this).enqueue(OneTimeWorkRequestBuilder<StepsWorker>().build())
    }

    private fun refreshStatus() {
        val prefs = Prefs(this)
        if (prefs.lastSync > 0) {
            val t = SimpleDateFormat("EEE h:mm a", Locale.getDefault()).format(Date(prefs.lastSync))
            setStatus("Last sync: $t · ${prefs.lastSteps} steps sent" + (if (prefs.lastError.isNotEmpty()) "\nLast problem: ${prefs.lastError}" else ""))
        } else if (prefs.lastError.isNotEmpty()) {
            setStatus("Not synced yet. Last problem: ${prefs.lastError}")
        }
    }

    private fun setStatus(s: String) { status.text = s }
}
