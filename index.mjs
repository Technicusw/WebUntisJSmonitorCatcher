// index.mjs - WebUntis Timetable Fetcher (Module & Executable)

// Importiere fetch für Node.js
import fetch from 'node-fetch';
// Importiere readline für interaktive Konsoleneingaben (nur bei direkter Ausführung benötigt)
import readline from 'readline';

// --- Konfiguration für die WebUntis API (Basis-Pfade) ---
const API_BASE_URL = "https://nessa.webuntis.com";
const CONTEXT_PATH = "/WebUntis";
const ENDPOINT = "monitor/substitution/data"; // Endpunkt für Vertretungsplan/Stundenplan

// --- Hilfsfunktionen ---

/**
 * Erstellt ein Datum im Untis-spezifischen YYYYMMDD-Format.
 * @param {Date} [dateObject=new Date()] - Das Datum-Objekt, das konvertiert werden soll.
 * @returns {number} Das Datum im YYYYMMDD-Format (z.B. 20250521).
 */
function getUntisDate(dateObject = new Date()) {
    const year = dateObject.getFullYear();
    const month = String(dateObject.getMonth() + 1).padStart(2, '0');
    const day = String(dateObject.getDate()).padStart(2, '0');
    return parseInt(`${year}${month}${day}`, 10);
}

/**
 * Grundlegende Payload-Struktur für die WebUntis Monitor-Anfrage.
 * Diese Werte sind für den `GamMa_SuS_2d_Monitor` spezifisch, können aber angepasst werden.
 *
 * WICHTIG: `schoolName`, `formatName` und `departmentIds` MÜSSEN von außen übergeben werden,
 * um das Skript generisch zu halten und keine schulspezifischen Daten fest zu codieren.
 */
const BASE_MONITOR_PAYLOAD_TEMPLATE = {
    "strikethrough": true,
    "mergeBlocks": true,
    "showOnlyFutureSub": false,
    "showBreakSupervisions": true,
    "showTeacher": true,
    "showClass": false,
    "showHour": true,
    "showInfo": true,
    "showRoom": true,
    "showSubject": true,
    "groupBy": 1,
    "hideAbsent": true,
    "departmentElementType": 1,
    "hideCancelWithSubstitution": true,
    "hideCancelCausedByEvent": false,
    "showTime": false,
    "showSubstText": true,
    "showAbsentElements": [2],
    "showAffectedElements": [],
    "showUnitTime": true,
    "showMessages": true,
    "showStudentgroup": false,
    "enableSubstitutionFrom": false,
    "showSubstitutionFrom": 0,
    "showTeacherOnEvent": false,
    "showAbsentTeacher": false,
    "strikethroughAbsentTeacher": true,
    "activityTypeIds": [],
    "showEvent": true,
    "showCancel": true,
    "showOnlyCancel": false,
    "showSubstTypeColor": false,
    "showExamSupervision": false,
    "showUnheraldedExams": false
};

// --- Typdefinitionen für JSDoc (optional, aber hilfreich) ---

/**
 * @typedef {object} SchoolConfig
 * @property {string} schoolName - Der vollständige Name der Schule (z.B. "Gymnasium am Markt").
 * @property {string} formatName - Der Formatname des Monitors (z.B. "GamMa_SuS_2d_Monitor").
 * @property {number[]} departmentIds - Ein Array von Abteilungs-IDs (z.B. [2, 1, 3]).
 */

/**
 * @typedef {object} TimetableQueryOptions
 * @property {Date} [targetDate=new Date()] - Das Basisdatum als Date-Objekt. Wird ignoriert, wenn dateOffset verwendet wird.
 * @property {number} [dateOffset=0] - Verschiebung in Tagen vom heutigen Datum (0 für heute, 1 für morgen, -1 für gestern).
 * @property {number} [numberOfDays=1] - Anzahl der Tage, die abgerufen werden sollen.
 * @property {string[]} [filterGroups] - Ein Array von Klassen/Kursen (z.B. ['11a', '12']), nach denen gefiltert werden soll. Leer/null/undefiniert für alle.
 */

/**
 * Ruft Stundenplandaten von WebUntis ab und filtert sie optional nach Klassen/Kursen.
 * Dies ist die Hauptfunktion des Moduls.
 *
 * @param {SchoolConfig} schoolConfig - Die Konfiguration spezifisch für die Schule.
 * @param {TimetableQueryOptions} [options={}] - Optionen für die Abfrage.
 * @returns {Promise<object|null>} Das abgerufene und optional gefilterte Payload-Objekt oder null bei Fehler.
 */
export async function getWebUntisTimetable(schoolConfig, options = {}) {
    // Standardwerte für Optionen setzen
    const { targetDate = new Date(), dateOffset = 0, numberOfDays = 1, filterGroups } = options;

    // Schulkonfiguration validieren
    if (!schoolConfig || !schoolConfig.schoolName || !schoolConfig.formatName || !Array.isArray(schoolConfig.departmentIds)) {
        console.error("Fehler: Ungültige Schulkonfiguration bereitgestellt.");
        return null;
    }

    // Ermittle das tatsächliche Abfragedatum
    const queryDate = new Date(targetDate);
    queryDate.setDate(queryDate.getDate() + dateOffset);
    const untisDate = getUntisDate(queryDate);

    // Erstelle den vollständigen Payload dynamisch
    const payload = {
        ...BASE_MONITOR_PAYLOAD_TEMPLATE, // Basis-Template verwenden
        "schoolName": schoolConfig.schoolName,
        "formatName": schoolConfig.formatName,
        "departmentIds": schoolConfig.departmentIds,
        date: untisDate,
        dateOffset: dateOffset,
        numberOfDays: numberOfDays
    };

    // Baue die URL mit dem schoolName-Parameter (URL-encoded)
    const requestUrl = `${API_BASE_URL}${CONTEXT_PATH}/${ENDPOINT}?school=${encodeURIComponent(schoolConfig.schoolName)}`;

    console.log(`\n--- Anfrage-Details ---`);
    console.log(`Abfrage für: ${queryDate.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${numberOfDays} Tag(e))`);
    if (filterGroups && filterGroups.length > 0) {
        console.log(`Filter für Klassen/Kurse: ${filterGroups.join(', ')}`);
    } else {
        console.log("Keine Klassen/Kurse gefiltert (alle anzeigen).");
    }
    console.log(`Anfrage-URL: ${requestUrl}`);
    console.log("Gesendeter Payload:", JSON.stringify(payload, null, 2));
    console.log(`--- Ende Anfrage-Details ---\n`);

    try {
        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP-Fehler! Status: ${response.status}`);
            console.error(`Fehlerdetails: ${errorText}`);
            throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (data.error) {
            console.error(`WebUntis API Fehler: ${data.error.message} (Code: ${data.error.code})`);
            throw new Error(`WebUntis API Fehler: ${data.error.message}`);
        }

        console.log("--- Erfolg ---");
        console.log("Daten erfolgreich abgerufen.");

        // --- FILTER-LOGIK ---
        let filteredRows = data.payload.rows;
        if (filterGroups && filterGroups.length > 0) {
            filteredRows = data.payload.rows.filter(row => filterGroups.includes(row.group));
        }

        const processedPayload = {
            ...data.payload,
            rows: filteredRows,
            absentElements: data.payload.absentElements // Abwesende Elemente werden immer alle angezeigt
        };

        // Die Konsole-Rendering-Funktion wird nun separat aufgerufen,
        // entweder im interaktiven Modus oder vom Import-Skript.
        return processedPayload; // Gib die verarbeiteten Daten zurück
    } catch (error) {
        console.error("Ein Fehler ist aufgetreten:", error.message);
        if (error.cause) {
            console.error("Ursprünglicher Fehlergrund:", error.cause);
        }
        return null;
    }
}

/**
 * Rendert die Stundenplandaten auf der Konsole.
 * Diese Funktion ist nicht exportiert, da sie primär für die Konsolenausgabe dieses Skripts gedacht ist.
 * @param {object} payloadData - Das verarbeitete Payload-Objekt.
 * @param {string[]} [filterApplied] - Die angewendeten Filtergruppen, falls vorhanden.
 */
function renderTimetableConsole(payloadData, filterApplied) {
    if (!payloadData || !payloadData.rows || payloadData.rows.length === 0) {
        console.log("Keine Stundenplan-Daten für diesen Tag oder die gewählten Filter gefunden.");
        return;
    }

    console.log("\n--- Stundenplan-Details ---");
    console.log(`Zuletzt aktualisiert: ${payloadData.lastUpdate}`);
    if (filterApplied && filterApplied.length > 0) {
        console.log(`(Anzeige gefiltert für: ${filterApplied.join(', ')})`);
    }

    const groupedTimetable = payloadData.rows.reduce((acc, row) => {
        const groupName = row.group || 'Unbekannte Gruppe';
        if (!acc[groupName]) {
            acc[groupName] = [];
        }
        acc[groupName].push(row);
        return acc;
    }, {});

    const sortedGroupNames = Object.keys(groupedTimetable).sort();

    if (sortedGroupNames.length === 0) {
        console.log("Nach Filterung keine Einträge gefunden.");
        return;
    }

    sortedGroupNames.forEach(groupName => {
        console.log(`\n--- Klasse: ${groupName} ---`);
        groupedTimetable[groupName].forEach(row => {
            const [stunde, fach, raum, lehrer, info] = row.data;
            const cleanInfo = info ? info.replace(/<[^>]*>/g, '') : '';
            let rowString = `  ${stunde || 'N/A'} | ${fach || 'N/A'} | ${raum || 'N/A'} | ${lehrer || 'N/A'}`;
            if (cleanInfo) rowString += ` | Info: ${cleanInfo}`;
            if (row.cellClasses && row.cellClasses['1'] && row.cellClasses['1'].includes('cancelStyle')) {
                rowString += ` (ENTFÄLLT)`;
            }
            console.log(rowString);
        });
    });

    if (payloadData.absentElements && payloadData.absentElements.length > 0) {
        console.log("\n--- Abwesende Lehrer/Elemente (ungfiltert) ---");
        payloadData.absentElements.forEach(absent => {
            console.log(`- ${absent.elementName || 'Unbekannt'} (${absent.absences[0]?.type || 'N/A'})`);
        });
    }
}

// --- Interaktive Ausführung des Skripts (läuft nur bei direktem Start) ---

// `import.meta.main` ist `true`, wenn das Modul direkt ausgeführt wird (`node index.mjs`)
// und `false`, wenn es importiert wird (`import { getWebUntisTimetable } from './index.mjs';`)
if (import.meta.main) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function askQuestion(query) {
        return new Promise(resolve => rl.question(query, resolve));
    }

    async function runInteractiveTimetableQuery() {
        console.log('\n--- WebUntis Stundenplan-Abfrage (Interaktiver Modus) ---');
        console.log('Du kannst Parameter eingeben oder leer lassen, um die Standardwerte zu verwenden.');

        // --- SCHULKONFIGURATION HIER EINGEBEN ---
        // Diese Daten sind schulspezifisch und müssen für deine Schule angepasst werden!
        const MY_SCHOOL_CONFIG = {
            schoolName: "Gymnasium am Markt", // <--- HIER DEINEN SCHULNAMEN EINGEBEN
            formatName: "GamMa_SuS_2d_Monitor", // <--- HIER DEINEN MONITOR-FORMATNAMEN EINGEBEN
            departmentIds: [2, 1, 3] // <--- HIER DEINE DEPARTMENT-IDs EINGEBEN
        };
        // ------------------------------------------

        let filterGroups = [];
        let targetDate = new Date();

        const classInput = await askQuestion('Gib die Klasse(n) oder Kurs(e) ein (z.B. 11a oder 12,13; **leer lassen für alle**): ');
        if (classInput.trim() !== '') {
            filterGroups = classInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }

        const dateInput = await askQuestion('Gib das Datum ein (JJJJ-MM-TT, z.B. 2025-05-22; **leer lassen für heute**): ');
        if (dateInput.trim() !== '') {
            try {
                const parts = dateInput.split('-');
                if (parts.length === 3) {
                    targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    if (isNaN(targetDate.getTime()) || targetDate.getFullYear() !== parseInt(parts[0]) || (targetDate.getMonth() + 1) !== parseInt(parts[1]) || targetDate.getDate() !== parseInt(parts[2])) {
                        console.log("Ungültiges Datum eingegeben. Verwende das heutige Datum.");
                        targetDate = new Date();
                    }
                } else {
                    console.log("Ungültiges Datumsformat. Verwende das heutige Datum.");
                    targetDate = new Date();
                }
            } catch (e) {
                console.log("Fehler beim Parsen des Datums. Verwende das heutige Datum.");
                targetDate = new Date();
            }
        }

        const result = await getWebUntisTimetable(MY_SCHOOL_CONFIG, { targetDate: targetDate, filterGroups: filterGroups });
        // renderTimetableConsole wird bereits innerhalb von getWebUntisTimetable aufgerufen.
        // Falls du das Ergebnis außerhalb der Funktion verarbeiten willst, kannst du es hier nutzen.

        rl.close();
    }

    runInteractiveTimetableQuery();
}
