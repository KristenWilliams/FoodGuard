package com.foodguard.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.view.View;

final class SpectrumSplashView extends View {
    private static final int COLUMNS = 24;
    private static final int ROWS = 12;
    private final Bitmap spectrum;
    private final View icon;
    private final Paint paint = new Paint(Paint.FILTER_BITMAP_FLAG);
    private final float[] vertices = new float[(COLUMNS + 1) * (ROWS + 1) * 2];
    private final int[] iconLocation = new int[2];
    private final int[] viewLocation = new int[2];
    private float progress;

    SpectrumSplashView(Context context, View icon) {
        super(context);
        this.icon = icon;
        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inScaled = false;
        spectrum = BitmapFactory.decodeResource(getResources(), R.drawable.foodguard_spectrum, options);
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
    }

    void setProgress(float value) {
        progress = value;
        invalidate();
    }

    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        if (spectrum == null || icon.getWidth() == 0 || icon.getHeight() == 0) return;
        icon.getLocationInWindow(iconLocation);
        getLocationInWindow(viewLocation);
        float size = Math.max(1f, Math.min(icon.getWidth(), icon.getHeight()));
        float left = iconLocation[0] - viewLocation[0] + (icon.getWidth() - size) / 2f;
        float top = iconLocation[1] - viewLocation[1] + (icon.getHeight() - size) / 2f;
        writeMesh(vertices, COLUMNS, ROWS, left, top, size, progress);
        canvas.drawBitmapMesh(spectrum, COLUMNS, ROWS, vertices, 0, null, 0, paint);
    }

    // The envelope returns to the source silhouette at both ends of the transition.
    static void writeMesh(float[] points, int columns, int rows, float left, float top, float size, float progress) {
        double phase = Math.PI * 2d * progress;
        double envelope = (1d - Math.cos(phase)) * 0.5d;
        int index = 0;
        for (int row = 0; row <= rows; row++) {
            double y = (double) row / rows;
            for (int column = 0; column <= columns; column++) {
                double x = (double) column / columns;
                double wave = Math.sin(x * Math.PI * 3d - phase);
                double stretch = 1d + envelope * (0.10d * wave + 0.018d);
                double drift = envelope * 0.022d * Math.sin(x * Math.PI * 2d - phase);
                points[index++] = left + (float) (x * size);
                points[index++] = top + (float) ((0.5d + (y - 0.5d) * stretch + drift) * size);
            }
        }
    }
}
