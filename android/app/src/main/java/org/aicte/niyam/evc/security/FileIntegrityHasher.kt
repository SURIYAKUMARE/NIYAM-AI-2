package org.aicte.niyam.evc.security

import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest

/**
 * SHA-256 FILE & PAYLOAD INTEGRITY UTILITY
 * 
 * Generates cryptographic tamper-evident signatures for offline inspection dockets
 * and geotagged evidentiary photographs prior to cloud synchronization.
 */
object FileIntegrityHasher {

    fun computeSha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        FileInputStream(file).use { fis ->
            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (fis.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
        }
        return digest.digest().toHexString()
    }

    fun computeSha256(text: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest(text.toByteArray(Charsets.UTF_8))
        return bytes.toHexString()
    }

    private fun ByteArray.toHexString(): String {
        return joinToString("") { "%02x".format(it) }
    }
}
