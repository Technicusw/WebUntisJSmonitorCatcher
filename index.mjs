// Importiere fetch für Node.js
import fetch from 'node-fetch';
// Importiere readline für interaktive Konsoleneingaben
import readline from 'readline';

// Bestätigte Werte aus deinen Netzwerk-Logs:
const API_BASE_URL = "https://nessa.webuntis.com";
const CONTEXT_PATH = "/WebUntis";
const ENDPOINT = "monitor/substitution/data"; // Für Vertretungsplan (oder 'activity/data' für Stundenplan)


// School Format 
const FormatName = ***  <== // hier Format Name eingeben
const SchoolName = ***  <== // hier School Name Eingeben
// Grundlegender Payload, der für alle Anfragen gleich bleibt
const BASE_PAYLOAD_STRUCTURE = {
    "formatName": SchoolName,
    "schoolName": FormatName,
    "strikethrough": true, // Zeigt durchgestrichene Stunden an
    "mergeBlocks": true,
    "showOnlyFutureSub": false,
    "showBreakSupervisions": true,
    "showTeacher": true,
    "showClass": false, // Bezieht sich auf die erste Spalte; in deinen Beispielen war dieser false
    "showHour": true, // Zeigt die Stunde an (z.B. "3 - 4")
    "showInfo": true, // Zeigt zusätzliche Informationen an
    "showRoom": true, // Zeigt den Raum an
    "showSubject": true, // Zeigt das Fach an
    "groupBy": 1, // Gruppiert nach Klasse
    "hideAbsent": true, // Versteckt abwesende Elemente, die nicht am Unterricht beteiligt sind (wie Lehrer mit Vertretung)
    "departmentIds": [2, 1, 3],
    "departmentElementType": 1,
    "hideCancelWithSubstitution": true, // Versteckt ausgefallene Stunden, wenn eine Vertretung gefunden wurde
    "hideCancelCausedByEvent": false, // Zeigt ausgefallene Stunden an, wenn sie durch ein Ereignis verursacht wurden
    "showTime": false,
    "showSubstText": true, // Zeigt den Vertretungstext an
    "showAbsentElements": [2], // Zeigt abwesende Lehrer an
    "showAffectedElements": [],
    "showUnitTime": true,
    "showMessages": true, // Zeigt allgemeine Nachrichten an
    "showStudentgroup": false,
    "enableSubstitutionFrom": false,
    "showSubstitutionFrom": 0,
    "showTeacherOnEvent": false,
    "showAbsentTeacher": false,
    "strikethroughAbsentTeacher": true,
    "activityTypeIds": [],
    "showEvent": true, // Wichtig: Zeigt auch Ereignisse an (wie Konferenzen etc.)
    "showCancel": true, // Wichtig: Zeigt auch ausgefallene Stunden an
    "showOnlyCancel": false, // Wichtig: Zeigt NICHT nur ausgefallene Stunden an (zeigt alle Stunden)
    "showSubstTypeColor": false,
    "showExamSupervision": false,
    "showUnheraldedExams": false
};

// Hilfsfunktion zur Erstellung des Untis-Datumsformats (YYYYMMDD)
function getUntisDate(dateObject = new Date()) {
    const year = dateObject.getFullYear();
    const month = String(dateObject.getMonth() + 1).padStart(2, '0'); // Monat ist 0-indiziert
    const day = String(dateObject.getDate()).padStart(2, '0');
    return parseInt(`${year}${month}${day}`, 10);
}

/**
 * Ruft Stundenplandaten von WebUntis ab und filtert sie optional nach Klassen/Kursen.
 * @param {object} options - Optionen für die Abfrage.
 * @param {Date} [options.targetDate=new Date()] - Das Basisdatum als Date-Objekt. Wird ignoriert, wenn dateOffset verwendet wird.
 * @param {number} [options.dateOffset=0] - Verschiebung in Tagen vom heutigen Datum (0 für heute, 1 für morgen, -1 für gestern).
 * @param {number} [options.numberOfDays=1] - Anzahl der Tage, die abgerufen werden sollen.
 * @param {string[]} [options.filterGroups] - Ein Array von Klassen/Kursen (z.B. ['11a', '12']), nach denen gefiltert werden soll. Leer lassen für alle.
 * @returns {Promise<object|null>} - Das abgerufene und optional gefilterte Payload-Objekt oder null bei Fehler.
 */
async function getWebUntisTimetable(options = {}) {
    const { targetDate = new Date(), dateOffset = 0, numberOfDays = 1, filterGroups } = options;

    // Ermittle das tatsächliche Abfragedatum
    const queryDate = new Date(targetDate);
    queryDate.setDate(queryDate.getDate() + dateOffset);
    const untisDate = getUntisDate(queryDate);

    // Erstelle den vollständigen Payload dynamisch
    const payload = {
        ...BASE_PAYLOAD_STRUCTURE,
        date: untisDate,
        dateOffset: dateOffset,
        numberOfDays: numberOfDays
    };

    // Baue die URL mit dem schoolName-Parameter (URL-encoded)
    const requestUrl = `${API_BASE_URL}${CONTEXT_PATH}/${ENDPOINT}?school=${encodeURIComponent(payload.schoolName)}`;

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
        // Wenn filterGroups leer ist, werden alle Reihen beibehalten.
        // Wenn filterGroups Werte enthält, wird nach diesen Klassen gefiltert.
        let filteredRows = data.payload.rows;
        if (filterGroups && filterGroups.length > 0) {
            filteredRows = data.payload.rows.filter(row => filterGroups.includes(row.group));
        }
        // --- ENDE FILTER-LOGIK ---

        const processedPayload = {
            ...data.payload,
            rows: filteredRows,
            absentElements: data.payload.absentElements // Abwesende Elemente werden immer alle angezeigt (betrifft Lehrer)
        };

        renderTimetableConsole(processedPayload, filterGroups);

        return processedPayload; // Gib die verarbeiteten Daten zurück
    } catch (error) {
        console.error("Ein Fehler ist aufgetreten:", error.message);
        if (error.cause) {
            console.error("Ursprünglicher Fehlergrund:", error.cause);
        }
        return null;
    }
}

// Funktion zum Rendern der Stundenplandaten auf der Konsole
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

    // Gruppieren der Einträge nach Klasse (group)
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
        // ALLE Unterrichtsstunden werden hier ausgegeben, unabhängig davon, ob sie ausfallen oder nicht.
        // Die "ENTFÄLLT"-Markierung ist eine Ergänzung für ausgefallene Stunden.
        groupedTimetable[groupName].forEach(row => {
            const [stunde, fach, raum, lehrer, info] = row.data;
            const cleanInfo = info ? info.replace(/<[^>]*>/g, '') : '';
            let rowString = `  ${stunde || 'N/A'} | ${fach || 'N/A'} | ${raum || 'N/A'} | ${lehrer || 'N/A'}`;
            if (cleanInfo) rowString += ` | Info: ${cleanInfo}`;
            // Markierung für ausgefallene Stunden
            if (row.cellClasses && row.cellClasses['1'] && row.cellClasses['1'].includes('cancelStyle')) {
                rowString += ` (ENTFÄLLT)`;
            }
            console.log(rowString);
        });
    });

    // Abwesende Elemente anzeigen (dieser Teil ist NICHT nach Klassen gefiltert, da Abwesenheiten Lehrer betreffen)
    if (payloadData.absentElements && payloadData.absentElements.length > 0) {
        console.log("\n--- Abwesende Lehrer/Elemente (ungfiltert) ---");
        payloadData.absentElements.forEach(absent => {
            console.log(`- ${absent.elementName || 'Unbekannt'} (${absent.absences[0]?.type || 'N/A'})`);
        });
    }
}


// --- Interaktive Ausführung des Skripts ---

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function runInteractiveTimetableQuery() {
    let filterGroups = []; // Wird zu einem leeren Array, wenn keine Eingabe erfolgt
    let targetDate = new Date(); // Standard: Heute

    console.log('\n--- WebUntis Stundenplan-Abfrage ---');
    console.log('Du kannst Parameter eingeben oder leer lassen, um die Standardwerte zu verwenden.');

    // Frage nach Klassen/Kursen
    const classInput = await askQuestion('Gib die Klasse(n) oder Kurs(e) ein (z.B. 11a oder 12,13; **leer lassen für alle**): ');
    if (classInput.trim() !== '') {
        filterGroups = classInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    // Frage nach dem Datum
    const dateInput = await askQuestion('Gib das Datum ein (JJJJ-MM-TT, z.B. 2025-05-22; **leer lassen für heute**): ');
    if (dateInput.trim() !== '') {
        try {
            const parts = dateInput.split('-');
            if (parts.length === 3) {
                targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                // Zusätzliche Überprüfung, ob das geparste Datum valide ist (z.B. nicht 2025-02-30)
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

    // Führe die Abfrage aus
    await getWebUntisTimetable({ targetDate: targetDate, filterGroups: filterGroups });

    rl.close(); // Schließe die Readline-Schnittstelle, wenn fertig
}

// Starte die interaktive Abfrage
runInteractiveTimetableQuery();
