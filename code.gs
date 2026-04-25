// ═══════════════════════════════════════════════════════
//  KÄNGURU-ZITATE — Google Apps Script Backend
//  Datei: code.gs
//  → Kompletten Inhalt in Google Apps Script einfügen
// ═══════════════════════════════════════════════════════

const SHEET_QUOTES  = "Zitate";
const SHEET_RATINGS = "Bewertungen";

const BUILTIN_QUOTES = [
  ["b01", "Wer nicht kämpft, hat schon verloren. Wer kämpft, kann verlieren. Wer nicht kämpft und trotzdem gewinnt, der hat einfach Glück gehabt.", "Friedrich Nietzsche", "Das Känguru", "Die Känguru-Chroniken"],
  ["b02", "Ich bin nicht links. Ich bin nur gegen Nazis. Das ist was ganz anderes.", "Johann Wolfgang von Goethe", "Das Känguru", "Die Känguru-Chroniken"],
  ["b03", "Der frühe Vogel kann mich mal.", "Immanuel Kant", "Das Känguru", "Die Känguru-Chroniken"],
  ["b04", "Ich teile alles. Ich bin Kommunist. Na ja, außer meinen Sachen natürlich.", "Karl Marx", "Das Känguru", "Die Känguru-Chroniken"],
  ["b05", "Solidarität ist die Zärtlichkeit der Völker.", "Friedrich Schiller", "Das Känguru (nach Che Guevara)", "Die Känguru-Chroniken"],
  ["b06", "Feste feiern, wie sie fallen. Und wenn sie nicht fallen – schubsen.", "Arthur Schopenhauer", "Das Känguru", "Die Känguru-Chroniken"],
  ["b07", "Der Kapitalismus ist ein Zombiesystem. Und Zombies bekämpft man mit Kopfschuss.", "Albert Einstein", "Das Känguru", "Die Känguru-Chroniken"],
  ["b08", "Ich hab nichts gegen Reiche. Ich hab was dagegen, dass es Arme gibt.", "Bertolt Brecht", "Das Känguru", "Die Känguru-Chroniken"],
  ["b09", "Manchmal sitze ich stundenlang da und denke. Manchmal sitze ich auch nur da.", "Sigmund Freud", "Das Känguru", "Die Känguru-Chroniken"],
  ["b10", "Wenn ich nicht so ein gutes Känguru wäre, wäre ich ein sehr schlechter Mensch.", "Mahatma Gandhi", "Das Känguru", "Die Känguru-Chroniken"],
  ["b11", "Wissen Sie, was das Schlimmste am Kapitalismus ist? Das Beste ist nicht gut genug.", "Winston Churchill", "Das Känguru", "Die Känguru-Chroniken"],
  ["b12", "Ich schlafe nicht. Ich warte.", "Sun Tzu", "Das Känguru", "Die Känguru-Chroniken"],
  ["b13", "Das hier ist keine Ideologie. Das ist Logik.", "Aristoteles", "Das Känguru", "Die Känguru-Chroniken"],
  ["b14", "Ich verbreite keine Gerüchte. Ich verbreite Wahrheiten, die noch nicht bewiesen sind.", "Voltaire", "Das Känguru", "Die Känguru-Chroniken"],
];

// ═══════════════════════════════════════════════════════
//  EINMALIG AUSFÜHREN: Tabellen anlegen + Zitate einfügen
//  Im Editor oben "initSheet" auswählen → ▶ Ausführen
// ═══════════════════════════════════════════════════════
function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Zitate-Tabelle
  let qSheet = ss.getSheetByName(SHEET_QUOTES);
  if (!qSheet) qSheet = ss.insertSheet(SHEET_QUOTES);
  qSheet.clearContents();
  qSheet.getRange(1,1,1,5).setValues([["id","text","wrongAuthor","realAuthor","source"]]);
  qSheet.getRange(1,1,1,5).setFontWeight("bold");
  qSheet.setFrozenRows(1);
  if (BUILTIN_QUOTES.length > 0) {
    qSheet.getRange(2,1,BUILTIN_QUOTES.length,5).setValues(BUILTIN_QUOTES);
  }
  qSheet.setColumnWidth(1,80);
  qSheet.setColumnWidth(2,420);
  qSheet.setColumnWidth(3,180);
  qSheet.setColumnWidth(4,180);
  qSheet.setColumnWidth(5,180);

  // Bewertungen-Tabelle
  let rSheet = ss.getSheetByName(SHEET_RATINGS);
  if (!rSheet) rSheet = ss.insertSheet(SHEET_RATINGS);
  rSheet.clearContents();
  rSheet.getRange(1,1,1,5).setValues([["id","funny","notFunny","guessCorrect","guessWrong"]]);
  rSheet.getRange(1,1,1,5).setFontWeight("bold");
  rSheet.setFrozenRows(1);

  SpreadsheetApp.getUi().alert(
    "Tabellen erfolgreich angelegt!\n\n" +
    "Naechster Schritt: Als Web App deployen.\n" +
    "Menue: Bereitstellen → Neue Bereitstellung"
  );
}

// ═══════════════════════════════════════════════════════
//  GET — Alle Zitate + Bewertungen laden
// ═══════════════════════════════════════════════════════
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Zitate
    const qSheet = ss.getSheetByName(SHEET_QUOTES);
    const qData  = qSheet.getDataRange().getValues();
    const quotes = [];
    for (let i = 1; i < qData.length; i++) {
      const [id, text, wrongAuthor, realAuthor, source] = qData[i];
      if (id && text) {
        quotes.push({
          id:          String(id),
          text:        String(text),
          wrongAuthor: String(wrongAuthor),
          realAuthor:  String(realAuthor),
          source:      String(source),
        });
      }
    }

    // Bewertungen
    const rSheet  = ss.getSheetByName(SHEET_RATINGS);
    const rData   = rSheet.getDataRange().getValues();
    const ratings = {};
    for (let i = 1; i < rData.length; i++) {
      const [id, funny, notFunny, guessCorrect, guessWrong] = rData[i];
      if (id) {
        ratings[String(id)] = {
          funny:        Number(funny)        || 0,
          notFunny:     Number(notFunny)     || 0,
          guessCorrect: Number(guessCorrect) || 0,
          guessWrong:   Number(guessWrong)   || 0,
        };
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok:true, quotes, ratings }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok:false, error:err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ═══════════════════════════════════════════════════════
//  POST — Neues Zitat ODER Bewertung speichern
// ═══════════════════════════════════════════════════════
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    // Neues Zitat hinzufügen
    if (data.type === "quote") {
      const sheet    = ss.getSheetByName(SHEET_QUOTES);
      const existing = sheet.getDataRange().getValues();

      // Duplikat-Check
      for (let i = 1; i < existing.length; i++) {
        if (String(existing[i][1]).trim() === String(data.text).trim()) {
          return ContentService
            .createTextOutput(JSON.stringify({ ok:false, error:"Dieses Zitat existiert bereits." }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }

      sheet.appendRow([
        data.id          || "u_" + Date.now(),
        data.text        || "",
        data.wrongAuthor || "",
        data.realAuthor  || "",
        data.source      || "Eigene Sammlung",
      ]);

      return ContentService
        .createTextOutput(JSON.stringify({ ok:true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Bewertung speichern
    if (data.type === "rating") {
      const sheet  = ss.getSheetByName(SHEET_RATINGS);
      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === String(data.id)) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) {
        sheet.appendRow([
          data.id,
          data.funny        || 0,
          data.notFunny     || 0,
          data.guessCorrect || 0,
          data.guessWrong   || 0,
        ]);
      } else {
        const row = values[rowIndex - 1];
        sheet.getRange(rowIndex,2).setValue((Number(row[1])||0) + (Number(data.funny)        ||0));
        sheet.getRange(rowIndex,3).setValue((Number(row[2])||0) + (Number(data.notFunny)     ||0));
        sheet.getRange(rowIndex,4).setValue((Number(row[3])||0) + (Number(data.guessCorrect) ||0));
        sheet.getRange(rowIndex,5).setValue((Number(row[4])||0) + (Number(data.guessWrong)   ||0));
      }

      return ContentService
        .createTextOutput(JSON.stringify({ ok:true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok:false, error:"Unbekannter Typ." }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok:false, error:err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
