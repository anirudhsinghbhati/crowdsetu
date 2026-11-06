package org.crowdsetu.scanner.data.local

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.crowdsetu.scanner.data.model.LocalScan
import org.crowdsetu.scanner.data.model.ScanSyncStatus

class LocalDatabase(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        const val DATABASE_NAME = "crowdsetu_scanner.db"
        const val DATABASE_VERSION = 1

        const val TABLE_SCANS = "scans"
        const val COL_ID = "id"
        const val COL_TOKEN = "token"
        const val COL_SIG = "sig"
        const val COL_CHECKPOINT = "checkpoint"
        const val COL_DIRECTION = "direction"
        const val COL_TIMESTAMP = "timestamp"
        const val COL_STATUS = "status"

        @Volatile
        private var INSTANCE: LocalDatabase? = null

        fun getInstance(context: Context): LocalDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: LocalDatabase(context.applicationContext).also { INSTANCE = it }
            }
        }
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE $TABLE_SCANS (
                $COL_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                $COL_TOKEN TEXT NOT NULL,
                $COL_SIG TEXT NOT NULL,
                $COL_CHECKPOINT TEXT NOT NULL,
                $COL_DIRECTION TEXT NOT NULL,
                $COL_TIMESTAMP TEXT NOT NULL,
                $COL_STATUS TEXT NOT NULL
            );
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_SCANS")
        onCreate(db)
    }

    fun insertScan(scan: LocalScan): Long {
        val db = writableDatabase
        val values = ContentValues().apply {
            put(COL_TOKEN, scan.token)
            put(COL_SIG, scan.sig)
            put(COL_CHECKPOINT, scan.checkpoint)
            put(COL_DIRECTION, scan.direction)
            put(COL_TIMESTAMP, scan.timestamp)
            put(COL_STATUS, scan.status.name)
        }
        return db.insert(TABLE_SCANS, null, values)
    }

    fun findRecentScan(token: String, checkpoint: String): LocalScan? {
        val db = readableDatabase
        val cursor = db.query(
            TABLE_SCANS,
            null,
            "$COL_TOKEN = ? AND $COL_CHECKPOINT = ?",
            arrayOf(token, checkpoint),
            null,
            null,
            "$COL_ID DESC",
            "1"
        )
        return cursor.use {
            if (it.moveToFirst()) {
                LocalScan(
                    id = it.getLong(it.getColumnIndexOrThrow(COL_ID)),
                    token = it.getString(it.getColumnIndexOrThrow(COL_TOKEN)),
                    sig = it.getString(it.getColumnIndexOrThrow(COL_SIG)),
                    checkpoint = it.getString(it.getColumnIndexOrThrow(COL_CHECKPOINT)),
                    direction = it.getString(it.getColumnIndexOrThrow(COL_DIRECTION)),
                    timestamp = it.getString(it.getColumnIndexOrThrow(COL_TIMESTAMP)),
                    status = ScanSyncStatus.valueOf(it.getString(it.getColumnIndexOrThrow(COL_STATUS)))
                )
            } else {
                null
            }
        }
    }

    fun getPendingScans(): List<LocalScan> {
        val db = readableDatabase
        val list = mutableListOf<LocalScan>()
        val cursor = db.query(
            TABLE_SCANS,
            null,
            "$COL_STATUS = ?",
            arrayOf(ScanSyncStatus.PENDING.name),
            null,
            null,
            "$COL_ID ASC"
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    LocalScan(
                        id = it.getLong(it.getColumnIndexOrThrow(COL_ID)),
                        token = it.getString(it.getColumnIndexOrThrow(COL_TOKEN)),
                        sig = it.getString(it.getColumnIndexOrThrow(COL_SIG)),
                        checkpoint = it.getString(it.getColumnIndexOrThrow(COL_CHECKPOINT)),
                        direction = it.getString(it.getColumnIndexOrThrow(COL_DIRECTION)),
                        timestamp = it.getString(it.getColumnIndexOrThrow(COL_TIMESTAMP)),
                        status = ScanSyncStatus.valueOf(it.getString(it.getColumnIndexOrThrow(COL_STATUS)))
                    )
                )
            }
        }
        return list
    }

    fun getAllScans(): List<LocalScan> {
        val db = readableDatabase
        val list = mutableListOf<LocalScan>()
        val cursor = db.query(
            TABLE_SCANS,
            null,
            null,
            null,
            null,
            null,
            "$COL_ID DESC",
            "100"
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    LocalScan(
                        id = it.getLong(it.getColumnIndexOrThrow(COL_ID)),
                        token = it.getString(it.getColumnIndexOrThrow(COL_TOKEN)),
                        sig = it.getString(it.getColumnIndexOrThrow(COL_SIG)),
                        checkpoint = it.getString(it.getColumnIndexOrThrow(COL_CHECKPOINT)),
                        direction = it.getString(it.getColumnIndexOrThrow(COL_DIRECTION)),
                        timestamp = it.getString(it.getColumnIndexOrThrow(COL_TIMESTAMP)),
                        status = ScanSyncStatus.valueOf(it.getString(it.getColumnIndexOrThrow(COL_STATUS)))
                    )
                )
            }
        }
        return list
    }

    fun markScansSynced(ids: List<Long>) {
        if (ids.isEmpty()) return
        val db = writableDatabase
        val values = ContentValues().apply {
            put(COL_STATUS, ScanSyncStatus.SYNCED.name)
        }
        val placeholders = ids.joinToString(",") { "?" }
        db.update(
            TABLE_SCANS,
            values,
            "$COL_ID IN ($placeholders)",
            ids.map { it.toString() }.toTypedArray()
        )
    }

    fun getPendingCount(): Int {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT COUNT(*) FROM $TABLE_SCANS WHERE $COL_STATUS = ?",
            arrayOf(ScanSyncStatus.PENDING.name)
        )
        return cursor.use {
            if (it.moveToFirst()) it.getInt(0) else 0
        }
    }
}

