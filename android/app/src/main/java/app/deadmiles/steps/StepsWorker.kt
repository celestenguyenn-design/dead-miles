package app.deadmiles.steps

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/** Reads today's step total from Health Connect and posts it to the game's server. */
class StepsWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    companion object {
        const val SUPABASE_URL = "https://edejxfcsjqwedbgulygi.supabase.co"
        const val ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZWp4ZmNzanF3ZWRiZ3VseWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NTExMzEsImV4cCI6MjEwNTAyNzEzMX0.Z0T954DSwTVlRM37i_fJLVtu_x2IrdOoJMx6ImInVKI"
    }

    override suspend fun doWork(): Result {
        val prefs = Prefs(applicationContext)
        if (prefs.handle.isEmpty() || prefs.token.isEmpty()) return Result.success()

        val steps: Long = try {
            readTodaySteps()
        } catch (e: Exception) {
            prefs.lastError = "reading steps: ${e.message ?: e.javaClass.simpleName}"
            return Result.retry()
        }

        return try {
            val ok = post(prefs.handle, prefs.token, steps)
            if (ok) {
                prefs.lastSync = System.currentTimeMillis()
                prefs.lastSteps = steps
                prefs.lastError = ""
                Result.success()
            } else {
                prefs.lastError = "the server said the handle or token is wrong"
                Result.success()
            }
        } catch (e: Exception) {
            prefs.lastError = "sending: ${e.message ?: e.javaClass.simpleName}"
            Result.retry()
        }
    }

    private suspend fun readTodaySteps(): Long {
        val client = HealthConnectClient.getOrCreate(applicationContext)
        val granted = client.permissionController.getGrantedPermissions()
        if (!granted.contains(HealthPermission.getReadPermission(StepsRecord::class))) {
            throw IllegalStateException("step access not allowed yet")
        }
        val zone = ZoneId.systemDefault()
        val start = LocalDate.now(zone).atStartOfDay()
        val end = LocalDateTime.now(zone)
        val result = client.aggregate(
            AggregateRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(start, end)
            )
        )
        return result[StepsRecord.COUNT_TOTAL] ?: 0L
    }

    private suspend fun post(handle: String, token: String, steps: Long): Boolean = withContext(Dispatchers.IO) {
        val body = JSONObject().put("p_handle", handle).put("p_token", token).put("p_steps", steps).toString()
        val conn = (URL("$SUPABASE_URL/rest/v1/rpc/post_steps").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15000
            readTimeout = 15000
            doOutput = true
            setRequestProperty("apikey", ANON_KEY)
            setRequestProperty("Authorization", "Bearer $ANON_KEY")
            setRequestProperty("Content-Type", "application/json")
        }
        conn.outputStream.use { it.write(body.toByteArray()) }
        val code = conn.responseCode
        val text = try { (if (code < 400) conn.inputStream else conn.errorStream)?.bufferedReader()?.readText() ?: "" } catch (e: Exception) { "" }
        conn.disconnect()
        if (code >= 400) throw IllegalStateException("HTTP $code ${text.take(120)}")
        text.trim() == "true"
    }
}
