/**
 * Week Plan — fill hex codes from cell background colours
 * ------------------------------------------------------
 * Colour cells in one column, get their hex codes (e.g. #3b6fb5) in another.
 * Google Sheets has no formula for this, so this small script does it.
 *
 * SETUP (one time):
 *   1. In your Google Sheet: Extensions ▸ Apps Script.
 *   2. Delete everything in the editor, paste THIS whole file, click Save (💾).
 *   3. Set the letters below to match your sheet.
 *   4a. EASIEST / AUTOMATIC: in the function dropdown (top, says "onOpen")
 *       choose "installAutoUpdate" and press Run once. Approve the permission.
 *       From now on the hex codes refresh by themselves every few minutes —
 *       no menu, no manual step.
 *   4b. OR run "fillHexCodes" whenever you want a one-off refresh, or reload
 *       the sheet to get a "Colours" menu at the right end of the menu bar.
 */

// ── Settings ──────────────────────────────────────────────
var FILL_COL    = "A";   // column whose CELL BACKGROUNDS you colour
var HEX_COL     = "A";   // column to write the hex codes into (same letter = one column)
var HEADER_ROWS = 1;     // how many header rows to skip at the top
var BLANK_FOR_WHITE = true;   // leave hex blank for un-coloured (white) cells
var AUTO_EVERY_MIN = 5;  // how often the automatic refresh runs (1, 5, 10, 15, or 30)
// ──────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Colours")
    .addItem("Fill hex codes now", "fillHexCodes")
    .addItem("Turn ON automatic refresh", "installAutoUpdate")
    .addItem("Turn OFF automatic refresh", "removeAutoUpdate")
    .addToUI();
}

function fillHexCodes() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var last = sh.getLastRow();
  if (last <= HEADER_ROWS) return;
  var firstRow = HEADER_ROWS + 1;
  var bgs = sh.getRange(FILL_COL + firstRow + ":" + FILL_COL + last).getBackgrounds();
  var out = bgs.map(function (row) {
    var hex = String(row[0] || "").toLowerCase();
    if (BLANK_FOR_WHITE && (hex === "#ffffff" || hex === "white" || hex === "")) hex = "";
    return [hex];
  });
  sh.getRange(HEX_COL + firstRow + ":" + HEX_COL + last).setValues(out);
}

function installAutoUpdate() {
  removeAutoUpdate();
  ScriptApp.newTrigger("fillHexCodes").timeBased().everyMinutes(AUTO_EVERY_MIN).create();
  fillHexCodes();
  try { SpreadsheetApp.getActive().toast("Automatic colour→hex refresh is ON (every " + AUTO_EVERY_MIN + " min)."); } catch (e) {}
}

function removeAutoUpdate() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "fillHexCodes") ScriptApp.deleteTrigger(t);
  });
}
