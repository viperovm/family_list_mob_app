package expo.modules.devicephone

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.telephony.TelephonyManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DevicePhoneModule : Module() {
  private val context: Context?
    get() = appContext.reactContext

  override fun definition() = ModuleDefinition {
    Name("DevicePhone")

    AsyncFunction<String?>("getLineNumber") {
      getLineNumber()
    }
  }

  private fun getLineNumber(): String? {
    val ctx = context ?: return null

    val hasPermission = ctx.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) ==
      PackageManager.PERMISSION_GRANTED
    if (!hasPermission) return null

    return try {
      val telephonyManager = ctx.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
      telephonyManager?.line1Number?.takeIf { it.isNotBlank() }
    } catch (e: SecurityException) {
      null
    }
  }
}
