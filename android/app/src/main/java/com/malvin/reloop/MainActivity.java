package com.malvin.reloop;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import android.net.Uri;
import android.media.AudioAttributes;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 15+ (SDK 35+, which this app targets) enforces edge-to-edge
        // display and simply ignores android:statusBarColor /
        // android:navigationBarColor set via styles.xml — those attributes
        // are left in place for older Android versions, but on modern
        // devices this is the only thing that actually controls how the
        // system bars look. Making the bars transparent lets the app's own
        // white background (already set via WebView backgroundColor) show
        // through underneath them, which is what makes them "match the
        // screen" rather than appear as a separate colored strip.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        // Dark icons/text on both bars, since they sit over a white
        // background and need contrast to stay readable.
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);
        }

        createNotificationChannel();
    }

    /**
     * Android 8+ (API 26+) requires every notification to belong to a
     * channel that's been explicitly registered before it's ever used — the
     * Cloud Function push payload references channelId "reloop_default"
     * (see functions/notifications.js), but that reference does nothing on
     * its own. This is what actually creates it, once, the first time the
     * app launches.
     *
     * IMPORTANCE_HIGH + vibration is what makes it show as a heads-up
     * banner with sound rather than silently landing in the notification
     * shade — this is the "tempting" part. The sound itself uses the
     * system default for now; to use a real custom sound, add an audio
     * file at android/app/src/main/res/raw/notification_sound.mp3 (or
     * .wav/.ogg) and uncomment the setSound() call below.
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
            "reloop_default",
            "Reloop notifications",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Purchases, sales, and listing updates");
        channel.enableLights(true);
        channel.setLightColor(Color.parseColor("#2563EB"));
        channel.enableVibration(true);

        // Uncomment once a real sound file exists at the path described above:
        Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/raw/notification_sound");
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
             .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
             .build();
         channel.setSound(soundUri, audioAttributes);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
