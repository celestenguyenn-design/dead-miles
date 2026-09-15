package app.deadmiles.steps

import android.content.Context

class Prefs(ctx: Context) {
    private val p = ctx.getSharedPreferences("deadmiles", Context.MODE_PRIVATE)
    var handle: String
        get() = p.getString("handle", "") ?: ""
        set(v) = p.edit().putString("handle", v).apply()
    var token: String
        get() = p.getString("token", "") ?: ""
        set(v) = p.edit().putString("token", v).apply()
    var lastSync: Long
        get() = p.getLong("lastSync", 0L)
        set(v) = p.edit().putLong("lastSync", v).apply()
    var lastSteps: Long
        get() = p.getLong("lastSteps", 0L)
        set(v) = p.edit().putLong("lastSteps", v).apply()
    var lastError: String
        get() = p.getString("lastError", "") ?: ""
        set(v) = p.edit().putString("lastError", v).apply()
}
