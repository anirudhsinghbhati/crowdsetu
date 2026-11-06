package org.crowdsetu.scanner

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.regex.Pattern

class ScanValidationTest {

    private val qrPattern = Pattern.compile("^(TK-[A-Fa-f0-9]{4})\\.([a-fA-F0-9]{8})$", Pattern.CASE_INSENSITIVE)

    @Test
    fun testValidQrCodes() {
        val validCodes = listOf(
            "TK-7842.8f9c1a7d",
            "TK-ABCD.12345678",
            "TK-0001.abcdef01",
            "tk-1234.8F9C1A7D"
        )

        for (code in validCodes) {
            val matcher = qrPattern.matcher(code)
            assertTrue("Expected code $code to be valid", matcher.matches())
            val token = matcher.group(1) ?: ""
            val sig = matcher.group(2) ?: ""
            assertTrue("Token must start with TK-", token.uppercase().startsWith("TK-"))
            assertEquals("Signature must be 8 hex characters", 8, sig.length)
        }
    }

    @Test
    fun testInvalidQrCodes() {
        val invalidCodes = listOf(
            "INVALID_CODE",
            "TK-12.8f9c1a7d",        // Too short token
            "TK-12345.8f9c1a7d",      // Too long token
            "TK-7842",                // Missing signature
            "TK-7842.1234",           // Short signature
            "TK-7842.1234567890",     // Long signature
            "7842.8f9c1a7d",          // Missing prefix
            "https://crowdsetu.org",  // URL
            ""
        )

        for (code in invalidCodes) {
            val matcher = qrPattern.matcher(code)
            assertFalse("Expected code $code to be invalid", matcher.matches())
        }
    }

    @Test
    fun testTokenExtraction() {
        val raw = "TK-9B3C.7e2d1f4a"
        val matcher = qrPattern.matcher(raw)
        assertTrue(matcher.matches())
        assertEquals("TK-9B3C", (matcher.group(1) ?: "").uppercase())
        assertEquals("7e2d1f4a", (matcher.group(2) ?: "").lowercase())
    }
}
