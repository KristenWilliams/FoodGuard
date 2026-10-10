package com.foodguard.app;

import static org.junit.Assert.*;
import org.junit.Test;

public class SpectrumSplashViewTest {
    private static final int COLUMNS = 24;
    private static final int ROWS = 12;

    private float[] mesh(float progress) {
        float[] points = new float[(COLUMNS + 1) * (ROWS + 1) * 2];
        SpectrumSplashView.writeMesh(points, COLUMNS, ROWS, 28f, 28f, 232f, progress);
        return points;
    }

    @Test public void endpointsMatchSourceAndEachOther() {
        float[] first = mesh(0f);
        float[] last = mesh(1f);
        assertArrayEquals(first, last, 0.001f);
        assertEquals(28f, first[0], 0.001f);
        assertEquals(28f, first[1], 0.001f);
        assertEquals(260f, first[first.length - 2], 0.001f);
        assertEquals(260f, first[first.length - 1], 0.001f);
    }

    @Test public void intermediateFrameHasBoundedRealMotion() {
        float[] first = mesh(0f);
        float[] middle = mesh(0.5f);
        double displacement = 0d;
        for (int i = 0; i < first.length; i += 2) {
            assertEquals(first[i], middle[i], 0.001f);
            assertTrue(Float.isFinite(middle[i + 1]));
            assertTrue(middle[i + 1] >= 0f && middle[i + 1] <= 288f);
            displacement += Math.abs(first[i + 1] - middle[i + 1]);
        }
        assertTrue(displacement > 100d);
    }
}
