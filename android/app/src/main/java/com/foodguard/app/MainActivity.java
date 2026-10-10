package com.foodguard.app;

import com.getcapacitor.BridgeActivity;
import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ValueAnimator;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.LinearInterpolator;
import androidx.core.splashscreen.SplashScreen;

public class MainActivity extends BridgeActivity {
    private ValueAnimator startupAnimator;

    @Override public void onCreate(Bundle savedInstanceState) {
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        registerPlugin(FoodGuardLocal.class);
        super.onCreate(savedInstanceState);
        splash.setOnExitAnimationListener(provider -> {
            boolean enabled = Build.VERSION.SDK_INT >= 26
                ? ValueAnimator.areAnimatorsEnabled()
                : Settings.Global.getFloat(getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f;
            if (!enabled || !(provider.getView() instanceof ViewGroup)) {
                provider.remove();
                return;
            }
            ViewGroup surface = (ViewGroup) provider.getView();
            View icon = provider.getIconView();
            SpectrumSplashView spectrum = new SpectrumSplashView(this, icon);
            surface.addView(spectrum, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            icon.setAlpha(0f);
            startupAnimator = ValueAnimator.ofFloat(0f, 1f);
            startupAnimator.setDuration(720L);
            startupAnimator.setInterpolator(new LinearInterpolator());
            startupAnimator.addUpdateListener(animation -> {
                float progress = (float) animation.getAnimatedValue();
                spectrum.setProgress(progress);
                surface.setAlpha(progress < 0.75f ? 1f : (1f - progress) * 4f);
            });
            startupAnimator.addListener(new AnimatorListenerAdapter() {
                @Override public void onAnimationEnd(Animator animation) {
                    provider.remove();
                    startupAnimator = null;
                }
            });
            startupAnimator.start();
        });
    }

    @Override public void onStop() {
        if (startupAnimator != null) startupAnimator.cancel();
        super.onStop();
    }

    @Override public void onDestroy() {
        if (startupAnimator != null) startupAnimator.cancel();
        super.onDestroy();
    }
}
