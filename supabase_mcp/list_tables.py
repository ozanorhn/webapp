#!/usr/bin/env python3

import psycopg2
import sys

# Datenbankverbindung
try:
    conn = psycopg2.connect(
        host="pw.eom.de",
        port=5432,
        database="postgres",
        user="postgres",
        password="your-super-secret-and-long-postgres-password"
    )

    cursor = conn.cursor()

    print("✅ Verbunden mit Datenbank!")
    print("-----------------------------------\n")

    # Abfrage aller Tabellen aus public schema
    cursor.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)

    tables = cursor.fetchall()

    if tables:
        print("📊 Alle Tabellen im 'public' Schema:\n")
        for idx, (table_name,) in enumerate(tables, 1):
            print(f"{idx}. {table_name}")
        print(f"\n📈 Insgesamt: {len(tables)} Tabellen")
    else:
        print("❌ Keine Tabellen gefunden!")

    cursor.close()
    conn.close()

except psycopg2.OperationalError as e:
    print(f"❌ Verbindungsfehler: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Fehler: {e}")
    sys.exit(1)
