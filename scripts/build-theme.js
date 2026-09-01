#!/usr/bin/env node
/**
 * Violet Hour theme builder.
 *
 * Reads theme/palette.json and expands it across the complete VS Code workbench
 * color key set, producing theme/VioletHour.json.
 *
 * The key set comes from scripts/baseline-keys.json, which is
 * ThemeConverterTests/TestFiles/Complete_Dark.json from
 * https://github.com/microsoft/theme-converter-for-vs -- the converter's own
 * reference for a "complete" theme. Using it as the key list guarantees every
 * key ThemeConverter looks for is present and explicitly set, which is the
 * whole point: an omitted key converts to a bad fallback, not a sane default.
 *
 * The build FAILS if any baseline key is left unassigned.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'theme/palette.json'), 'utf8'));
const BASELINE = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline-keys.json'), 'utf8'));

const N = P.neutral, F = P.fg, S = P.state, X = P.syntax;

// ---------------------------------------------------------------- color utils
const parse = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
/** Linear blend: t=0 -> a, t=1 -> b. Used for derived tints so every color in
 *  the theme still traces back to a palette entry. */
const mix = (a, b, t) => hex(parse(a).map((v, i) => v + (parse(b)[i] - v) * t));
const alpha = (h, a) => h + a; // a = two hex digits

// -------------------------------------------------------------- derived tints
const D = {
  accentHover:    mix(S.accent, F.primary, 0.20),
  errorBg:        mix(S.error, N.well, 0.42),
  warnBg:         mix(S.warning, N.well, 0.38),
  infoBg:         mix(S.info, N.well, 0.42),
  errorWash:      mix(S.error, N.editorBg, 0.14),
  warnWash:       mix(S.warning, N.editorBg, 0.14),
  infoWash:       mix(S.info, N.editorBg, 0.14),
  addedWash:      mix(S.gitAdded, N.editorBg, 0.18),
  removedWash:    mix(S.gitRemoved, N.editorBg, 0.18),
  currentMerge:   mix(X.keyword, N.editorBg, 0.22),
  currentMergeH:  mix(X.keyword, N.editorBg, 0.42),
  incomingMerge:  mix(S.accent, N.editorBg, 0.22),
  incomingMergeH: mix(S.accent, N.editorBg, 0.42),
  debugBar:       mix(X.keyword, N.well, 0.45),
  stackFrame:     mix(S.warning, N.editorBg, 0.20),
  focusedFrame:   mix(S.gitAdded, N.editorBg, 0.20),
  bright:         col => mix(col, F.primary, 0.30),
};

// ------------------------------------------------------------------- the map
const c = {};
const set = o => Object.assign(c, o);

set({
  foreground: F.primary,
  descriptionForeground: F.muted,
  errorForeground: S.error,
  focusBorder: S.accent,
  contrastBorder: N.border,
  contrastActiveBorder: S.accent,
  'widget.shadow': N.well,
  'icon.foreground': F.secondary,
  'selection.background': N.selectionBg,
  'sash.hoverBorder': S.accent,
  'scm.providerBorder': N.border,
  'progressBar.background': S.accent,
});

set({
  'textLink.foreground': S.accent,
  'textLink.activeForeground': D.accentHover,
  'textBlockQuote.background': N.panelBg,
  'textBlockQuote.border': S.accent,
  'textCodeBlock.background': N.well,
  'textPreformat.foreground': X.string,
  'textSeparator.foreground': N.border,
  'notificationLink.foreground': S.accent,
});

set({
  'activityBar.background': N.panelBg,
  'activityBar.foreground': F.secondary,
  'activityBar.inactiveForeground': F.muted,
  'activityBar.border': N.border,
  'activityBar.activeBorder': S.accent,
  'activityBar.activeBackground': N.hoverBg,
  'activityBar.activeFocusBorder': S.accent,
  'activityBar.dropBorder': S.accent,
  'activityBarBadge.background': S.accent,
  'activityBarBadge.foreground': N.editorBg,
  'badge.background': S.accent,
  'badge.foreground': N.editorBg,
  'extensionBadge.remoteBackground': S.accent,
  'extensionBadge.remoteForeground': N.editorBg,
  'extensionButton.prominentBackground': S.accent,
  'extensionButton.prominentForeground': N.editorBg,
  'extensionButton.prominentHoverBackground': D.accentHover,
  'extensionIcon.starForeground': S.warning,
});

set({
  'banner.background': N.chromeBg,
  'banner.foreground': F.primary,
  'banner.iconForeground': S.accent,
  'breadcrumb.background': N.editorBg,
  'breadcrumb.foreground': F.muted,
  'breadcrumb.focusForeground': F.primary,
  'breadcrumb.activeSelectionForeground': S.accent,
  'breadcrumbPicker.background': N.panelBg,
});

set({
  'button.background': S.accent,
  'button.foreground': N.editorBg,
  'button.hoverBackground': D.accentHover,
  'button.border': N.border,
  'button.secondaryBackground': N.chromeBg,
  'button.secondaryForeground': F.primary,
  'button.secondaryHoverBackground': N.hoverBg,
  'checkbox.background': N.panelBg,
  'checkbox.border': N.indentGuideActive,
  'checkbox.foreground': F.primary,
});

set({
  'charts.foreground': F.primary,
  'charts.lines': N.indentGuide,
  'charts.blue': S.accent,
  'charts.green': S.gitAdded,
  'charts.orange': X.number,
  'charts.purple': X.keyword,
  'charts.red': S.error,
  'charts.yellow': S.warning,
});

set({
  'debugConsole.errorForeground': S.error,
  'debugConsole.infoForeground': S.info,
  'debugConsole.sourceForeground': F.secondary,
  'debugConsole.warningForeground': S.warning,
  'debugConsoleInputIcon.foreground': S.accent,
  'debugExceptionWidget.background': N.chromeBg,
  'debugExceptionWidget.border': S.error,
  'debugToolBar.background': N.chromeBg,
  'debugToolBar.border': N.border,
  'debugView.exceptionLabelBackground': D.errorBg,
  'debugView.exceptionLabelForeground': F.primary,
  'debugView.stateLabelBackground': N.chromeBg,
  'debugView.stateLabelForeground': F.secondary,
  'debugView.valueChangedHighlight': S.accent,
  'debugIcon.breakpointForeground': S.error,
  'debugIcon.breakpointDisabledForeground': F.muted,
  'debugIcon.breakpointUnverifiedForeground': F.muted,
  'debugIcon.breakpointCurrentStackframeForeground': S.warning,
  'debugIcon.breakpointStackframeForeground': F.secondary,
  'debugIcon.startForeground': S.gitAdded,
  'debugIcon.continueForeground': S.gitAdded,
  'debugIcon.restartForeground': S.gitAdded,
  'debugIcon.pauseForeground': S.accent,
  'debugIcon.stopForeground': S.error,
  'debugIcon.disconnectForeground': S.error,
  'debugIcon.stepBackForeground': S.accent,
  'debugIcon.stepIntoForeground': S.accent,
  'debugIcon.stepOutForeground': S.accent,
  'debugIcon.stepOverForeground': S.accent,
  'debugTokenExpression.name': X.property,
  'debugTokenExpression.value': F.secondary,
  'debugTokenExpression.string': X.string,
  'debugTokenExpression.number': X.number,
  'debugTokenExpression.boolean': X.number,
  'debugTokenExpression.error': S.error,
});

set({
  'diffEditor.insertedTextBackground': D.addedWash,
  'diffEditor.removedTextBackground': D.removedWash,
  'diffEditor.insertedTextBorder': mix(S.gitAdded, N.editorBg, 0.35),
  'diffEditor.removedTextBorder': mix(S.gitRemoved, N.editorBg, 0.35),
  'diffEditor.border': N.border,
  'diffEditor.diagonalFill': N.indentGuide,
});

set({
  'dropdown.background': N.panelBg,
  'dropdown.listBackground': N.panelBg,
  'dropdown.border': N.indentGuideActive,
  'dropdown.foreground': F.primary,
  'input.background': N.panelBg,
  'input.foreground': F.primary,
  'input.border': N.indentGuideActive,
  'input.placeholderForeground': F.muted,
  'inputOption.activeBackground': N.selectionBg,
  'inputOption.activeBorder': S.accent,
  'inputOption.activeForeground': F.primary,
  'inputValidation.errorBackground': D.errorBg,
  'inputValidation.errorBorder': S.error,
  'inputValidation.errorForeground': F.primary,
  'inputValidation.infoBackground': D.infoBg,
  'inputValidation.infoBorder': S.info,
  'inputValidation.infoForeground': F.primary,
  'inputValidation.warningBackground': D.warnBg,
  'inputValidation.warningBorder': S.warning,
  'inputValidation.warningForeground': F.primary,
  'panelInput.border': N.indentGuideActive,
});

set({
  'editor.background': N.editorBg,
  'editor.foreground': F.primary,
  'editor.selectionBackground': N.selectionBg,
  'editor.selectionForeground': F.primary,
  'editor.inactiveSelectionBackground': N.inactiveSelBg,
  'editor.selectionHighlightBackground': S.findOtherBg,
  'editor.selectionHighlightBorder': N.border,
  'editor.findMatchBackground': S.findMatchBg,
  'editor.findMatchBorder': S.accent,
  'editor.findMatchHighlightBackground': S.findOtherBg,
  'editor.findMatchHighlightBorder': N.border,
  'editor.findRangeHighlightBackground': N.inactiveSelBg,
  'editor.findRangeHighlightBorder': N.border,
  'editor.hoverHighlightBackground': N.hoverBg,
  'editor.lineHighlightBackground': N.chromeBg,
  'editor.lineHighlightBorder': N.chromeBg,
  'editor.rangeHighlightBackground': N.inactiveSelBg,
  'editor.rangeHighlightBorder': N.border,
  'editor.wordHighlightBackground': S.findOtherBg,
  'editor.wordHighlightBorder': N.border,
  'editor.wordHighlightStrongBackground': S.findMatchBg,
  'editor.wordHighlightStrongBorder': N.indentGuideActive,
  'editor.foldBackground': N.inactiveSelBg,
  'editor.linkedEditingBackground': N.hoverBg,
  'editor.inlineValuesBackground': N.chromeBg,
  'editor.inlineValuesForeground': F.muted,
  'editor.snippetTabstopHighlightBackground': N.inactiveSelBg,
  'editor.snippetTabstopHighlightBorder': N.border,
  'editor.snippetFinalTabstopHighlightBackground': N.inactiveSelBg,
  'editor.snippetFinalTabstopHighlightBorder': S.accent,
  'editor.stackFrameHighlightBackground': D.stackFrame,
  'editor.focusedStackFrameHighlightBackground': D.focusedFrame,
  'editor.symbolHighlightBackground': S.findOtherBg,
  'editor.symbolHighlightBorder': N.border,
  'editorPane.background': N.editorBg,
  'editorRuler.foreground': N.indentGuide,
  'editorWhitespace.foreground': N.indentGuide,
  'editorIndentGuide.background': N.indentGuide,
  'editorIndentGuide.activeBackground': N.indentGuideActive,
  'editorCodeLens.foreground': F.muted,
  'editorCursor.foreground': S.cursor,
  'editorCursor.background': N.editorBg,
  'editorGhostText.foreground': F.muted,
  'editorGhostText.border': N.border,
  'editorInlayHint.background': N.chromeBg,
  'editorInlayHint.foreground': F.mutedOnChrome,
  'editorLineNumber.foreground': F.muted,
  'editorLineNumber.activeForeground': F.secondary,
  'editorActiveLineNumber.foreground': F.secondary,
  'editorLink.activeForeground': S.accent,
  'editorLightBulb.foreground': S.warning,
  'editorLightBulbAutoFix.foreground': S.gitAdded,
  'editorUnnecessaryCode.opacity': alpha(N.well, '99'),
  'editorUnnecessaryCode.border': F.muted,
});

set({
  'editorBracketHighlight.foreground1': S.accent,
  'editorBracketHighlight.foreground2': X.property,
  'editorBracketHighlight.foreground3': X.keyword,
  'editorBracketHighlight.foreground4': X.type,
  'editorBracketHighlight.foreground5': X.number,
  'editorBracketHighlight.foreground6': X.regex,
  'editorBracketHighlight.unexpectedBracket.foreground': S.error,
  'editorBracketMatch.background': N.inactiveSelBg,
  'editorBracketMatch.border': N.indentGuideActive,
});

set({
  'editorError.foreground': S.error,
  'editorError.background': D.errorWash,
  'editorError.border': mix(S.error, N.editorBg, 0.35),
  'editorWarning.foreground': S.warning,
  'editorWarning.background': D.warnWash,
  'editorWarning.border': mix(S.warning, N.editorBg, 0.35),
  'editorInfo.foreground': S.info,
  'editorInfo.background': D.infoWash,
  'editorInfo.border': mix(S.info, N.editorBg, 0.35),
  'editorHint.foreground': F.muted,
  'editorHint.border': N.border,
  'problemsErrorIcon.foreground': S.error,
  'problemsWarningIcon.foreground': S.warning,
  'problemsInfoIcon.foreground': S.info,
});

set({
  'editorGroup.border': N.border,
  'editorGroup.background': N.editorBg,
  'editorGroup.emptyBackground': N.editorBg,
  'editorGroup.dropBackground': N.selectionBg,
  'editorGroup.focusedEmptyBorder': S.accent,
  'editorGroupHeader.tabsBackground': N.panelBg,
  'editorGroupHeader.tabsBorder': N.border,
  'editorGroupHeader.noTabsBackground': N.panelBg,
  'editorGroupHeader.border': N.border,
  'editorGutter.background': N.editorBg,
  'editorGutter.addedBackground': S.gitAdded,
  'editorGutter.deletedBackground': S.gitRemoved,
  'editorGutter.modifiedBackground': S.gitModified,
  'editorGutter.commentRangeForeground': F.muted,
  'editorGutter.foldingControlForeground': F.muted,
});

set({
  'editorHoverWidget.background': N.panelBg,
  'editorHoverWidget.foreground': F.primary,
  'editorHoverWidget.border': N.border,
  'editorHoverWidget.statusBarBackground': N.chromeBg,
  'editorWidget.background': N.panelBg,
  'editorWidget.foreground': F.primary,
  'editorWidget.border': N.border,
  'editorWidget.resizeBorder': S.accent,
  'editorSuggestWidget.background': N.panelBg,
  'editorSuggestWidget.border': N.border,
  'editorSuggestWidget.foreground': F.primary,
  'editorSuggestWidget.selectedBackground': N.selectionBg,
  'editorSuggestWidget.selectedForeground': F.primary,
  'editorSuggestWidget.selectedIconForeground': S.accent,
  'editorSuggestWidget.highlightForeground': S.accent,
  'editorSuggestWidget.focusHighlightForeground': S.accent,
});

set({
  'editorMarkerNavigation.background': N.panelBg,
  'editorMarkerNavigationError.background': D.errorWash,
  'editorMarkerNavigationError.headerBackground': D.errorBg,
  'editorMarkerNavigationWarning.background': D.warnWash,
  'editorMarkerNavigationWarning.headerBackground': D.warnBg,
  'editorMarkerNavigationInfo.background': D.infoWash,
  'editorMarkerNavigationInfo.headerBackground': D.infoBg,
});

set({
  'editorOverviewRuler.background': N.editorBg,
  'editorOverviewRuler.border': N.border,
  'editorOverviewRuler.addedForeground': S.gitAdded,
  'editorOverviewRuler.deletedForeground': S.gitRemoved,
  'editorOverviewRuler.modifiedForeground': S.gitModified,
  'editorOverviewRuler.errorForeground': S.error,
  'editorOverviewRuler.warningForeground': S.warning,
  'editorOverviewRuler.infoForeground': S.info,
  'editorOverviewRuler.findMatchForeground': S.accent,
  'editorOverviewRuler.bracketMatchForeground': N.indentGuideActive,
  'editorOverviewRuler.rangeHighlightForeground': N.indentGuideActive,
  'editorOverviewRuler.selectionHighlightForeground': N.indentGuideActive,
  'editorOverviewRuler.wordHighlightForeground': N.indentGuideActive,
  'editorOverviewRuler.wordHighlightStrongForeground': S.accent,
  'editorOverviewRuler.commonContentForeground': N.indentGuide,
  'editorOverviewRuler.currentContentForeground': X.keyword,
  'editorOverviewRuler.incomingContentForeground': S.accent,
});

set({
  'gitDecoration.addedResourceForeground': S.gitAdded,
  'gitDecoration.modifiedResourceForeground': S.gitModified,
  'gitDecoration.deletedResourceForeground': S.gitRemoved,
  'gitDecoration.renamedResourceForeground': S.accent,
  'gitDecoration.untrackedResourceForeground': S.gitAdded,
  'gitDecoration.ignoredResourceForeground': F.muted,
  'gitDecoration.conflictingResourceForeground': X.number,
  'gitDecoration.stageDeletedResourceForeground': S.gitRemoved,
  'gitDecoration.stageModifiedResourceForeground': S.gitModified,
  'gitDecoration.submoduleResourceForeground': X.property,
});

set({
  'interactive.activeCodeBorder': S.accent,
  'interactive.inactiveCodeBorder': N.border,
  'keybindingLabel.background': N.chromeBg,
  'keybindingLabel.foreground': F.primary,
  'keybindingLabel.border': N.border,
  'keybindingLabel.bottomBorder': N.border,
});

set({
  'list.activeSelectionBackground': N.selectionBg,
  'list.activeSelectionForeground': F.primary,
  'list.activeSelectionIconForeground': S.accent,
  'list.focusBackground': N.selectionBg,
  'list.focusForeground': F.primary,
  'list.focusOutline': S.accent,
  'list.focusHighlightForeground': S.accent,
  'list.hoverBackground': N.hoverBg,
  'list.hoverForeground': F.primary,
  'list.inactiveSelectionBackground': N.inactiveSelBg,
  'list.inactiveSelectionForeground': F.primary,
  'list.inactiveSelectionIconForeground': F.secondary,
  'list.inactiveFocusBackground': N.inactiveSelBg,
  'list.inactiveFocusOutline': N.border,
  'list.highlightForeground': S.accent,
  'list.deemphasizedForeground': F.muted,
  'list.errorForeground': S.error,
  'list.warningForeground': S.warning,
  'list.invalidItemForeground': F.muted,
  'list.dropBackground': N.selectionBg,
  'list.filterMatchBackground': S.findMatchBg,
  'list.filterMatchBorder': S.accent,
  'listFilterWidget.background': N.panelBg,
  'listFilterWidget.outline': S.accent,
  'listFilterWidget.noMatchesOutline': S.error,
  'tree.indentGuidesStroke': N.indentGuide,
  'tree.tableColumnsBorder': N.border,
});

set({
  'menu.background': N.panelBg,
  'menu.foreground': F.primary,
  'menu.border': N.border,
  'menu.selectionBackground': N.selectionBg,
  'menu.selectionForeground': F.primary,
  'menu.selectionBorder': S.accent,
  'menu.separatorBackground': N.border,
  'menubar.selectionBackground': N.selectionBg,
  'menubar.selectionForeground': F.primary,
  'menubar.selectionBorder': S.accent,
});

set({
  'merge.border': N.border,
  'merge.currentHeaderBackground': D.currentMergeH,
  'merge.currentContentBackground': D.currentMerge,
  'merge.incomingHeaderBackground': D.incomingMergeH,
  'merge.incomingContentBackground': D.incomingMerge,
  'merge.commonHeaderBackground': N.chromeBg,
  'merge.commonContentBackground': N.inactiveSelBg,
});

set({
  'minimap.background': N.editorBg,
  'minimap.errorHighlight': S.error,
  'minimap.warningHighlight': S.warning,
  'minimap.findMatchHighlight': S.accent,
  'minimap.selectionHighlight': N.selectionBg,
  'minimapGutter.addedBackground': S.gitAdded,
  'minimapGutter.deletedBackground': S.gitRemoved,
  'minimapGutter.modifiedBackground': S.gitModified,
  'minimapSlider.background': N.scrollSlider,
  'minimapSlider.hoverBackground': N.scrollSliderHover,
  'minimapSlider.activeBackground': N.scrollSliderActive,
  'scrollbar.shadow': N.well,
  'scrollbarSlider.background': N.scrollSlider,
  'scrollbarSlider.hoverBackground': N.scrollSliderHover,
  'scrollbarSlider.activeBackground': N.scrollSliderActive,
  'notebookScrollbarSlider.background': N.scrollSlider,
  'notebookScrollbarSlider.hoverBackground': N.scrollSliderHover,
  'notebookScrollbarSlider.activeBackground': N.scrollSliderActive,
});

set({
  'notebook.cellBorderColor': N.border,
  'notebook.cellEditorBackground': N.editorBg,
  'notebook.cellInsertionIndicator': S.accent,
  'notebook.cellStatusBarItemHoverBackground': N.hoverBg,
  'notebook.cellToolbarSeparator': N.border,
  'notebook.cellHoverBackground': N.hoverBg,
  'notebook.focusedCellBackground': N.inactiveSelBg,
  'notebook.focusedCellBorder': S.accent,
  'notebook.focusedEditorBorder': S.accent,
  'notebook.inactiveFocusedCellBorder': N.border,
  'notebook.inactiveSelectedCellBorder': N.border,
  'notebook.selectedCellBackground': N.inactiveSelBg,
  'notebook.selectedCellBorder': S.accent,
  'notebook.symbolHighlightBackground': S.findOtherBg,
  'notebook.outputContainerBackgroundColor': N.panelBg,
  'notebookStatusErrorIcon.foreground': S.error,
  'notebookStatusRunningIcon.foreground': S.warning,
  'notebookStatusSuccessIcon.foreground': S.gitAdded,
});

set({
  'notifications.background': N.panelBg,
  'notifications.foreground': F.primary,
  'notifications.border': N.border,
  'notificationCenter.border': N.border,
  'notificationCenterHeader.background': N.chromeBg,
  'notificationCenterHeader.foreground': F.secondary,
  'notificationToast.border': N.border,
  'notificationsErrorIcon.foreground': S.error,
  'notificationsWarningIcon.foreground': S.warning,
  'notificationsInfoIcon.foreground': S.info,
});

set({
  'panel.background': N.panelBg,
  'panel.border': N.border,
  'panel.dropBorder': S.accent,
  'panelSection.border': N.border,
  'panelSection.dropBackground': N.selectionBg,
  'panelSectionHeader.background': N.chromeBg,
  'panelSectionHeader.border': N.border,
  'panelSectionHeader.foreground': F.primary,
  'panelTitle.activeBorder': S.accent,
  'panelTitle.activeForeground': F.primary,
  'panelTitle.inactiveForeground': F.muted,
});

set({
  'peekView.border': S.accent,
  'peekViewEditor.background': N.well,
  'peekViewEditor.matchHighlightBackground': S.findMatchBg,
  'peekViewEditor.matchHighlightBorder': S.accent,
  'peekViewEditorGutter.background': N.well,
  'peekViewResult.background': N.panelBg,
  'peekViewResult.fileForeground': F.primary,
  'peekViewResult.lineForeground': F.muted,
  'peekViewResult.matchHighlightBackground': S.findMatchBg,
  'peekViewResult.selectionBackground': N.selectionBg,
  'peekViewResult.selectionForeground': F.primary,
  'peekViewTitle.background': N.chromeBg,
  'peekViewTitleLabel.foreground': F.primary,
  'peekViewTitleDescription.foreground': F.muted,
  'pickerGroup.border': N.border,
  'pickerGroup.foreground': S.accent,
  'ports.iconRunningProcessForeground': S.gitAdded,
});

set({
  'quickInput.background': N.panelBg,
  'quickInput.foreground': F.primary,
  'quickInput.list.focusBackground': N.selectionBg,
  'quickInputList.focusBackground': N.selectionBg,
  'quickInputList.focusForeground': F.primary,
  'quickInputList.focusIconForeground': S.accent,
  'quickInputTitle.background': N.chromeBg,
  'searchEditor.findMatchBackground': S.findMatchBg,
  'searchEditor.findMatchBorder': S.accent,
  'searchEditor.textInputBorder': N.indentGuideActive,
});

set({
  'settings.checkboxBackground': N.panelBg,
  'settings.checkboxBorder': N.indentGuideActive,
  'settings.checkboxForeground': F.primary,
  'settings.dropdownBackground': N.panelBg,
  'settings.dropdownBorder': N.indentGuideActive,
  'settings.dropdownForeground': F.primary,
  'settings.dropdownListBorder': N.border,
  'settings.focusedRowBackground': N.hoverBg,
  'settings.focusedRowBorder': S.accent,
  'settings.headerForeground': F.primary,
  'settings.modifiedItemIndicator': S.accent,
  'settings.numberInputBackground': N.panelBg,
  'settings.numberInputForeground': X.number,
  'settings.numberInputBorder': N.indentGuideActive,
  'settings.textInputBackground': N.panelBg,
  'settings.textInputForeground': F.primary,
  'settings.textInputBorder': N.indentGuideActive,
  'settings.rowHoverBackground': N.hoverBg,
});

set({
  'sideBar.background': N.panelBg,
  'sideBar.foreground': F.secondary,
  'sideBar.border': N.border,
  'sideBar.dropBackground': N.selectionBg,
  'sideBarTitle.foreground': F.secondary,
  'sideBarSectionHeader.background': N.chromeBg,
  'sideBarSectionHeader.foreground': F.primary,
  'sideBarSectionHeader.border': N.border,
});

set({
  'statusBar.background': N.chromeBg,
  'statusBar.foreground': F.secondary,
  'statusBar.border': N.border,
  'statusBar.debuggingBackground': D.debugBar,
  'statusBar.debuggingForeground': F.primary,
  'statusBar.debuggingBorder': N.border,
  'statusBar.noFolderBackground': N.chromeBg,
  'statusBar.noFolderForeground': F.secondary,
  'statusBar.noFolderBorder': N.border,
  'statusBarItem.activeBackground': N.selectionBg,
  'statusBarItem.hoverBackground': N.hoverBg,
  'statusBarItem.prominentBackground': N.selectionBg,
  'statusBarItem.prominentForeground': F.primary,
  'statusBarItem.prominentHoverBackground': N.hoverBg,
  'statusBarItem.errorBackground': D.errorBg,
  'statusBarItem.errorForeground': F.primary,
  'statusBarItem.warningBackground': D.warnBg,
  'statusBarItem.warningForeground': F.primary,
  'statusBarItem.remoteBackground': S.accent,
  'statusBarItem.remoteForeground': N.editorBg,
});

set({
  'symbolIcon.arrayForeground': X.property,
  'symbolIcon.booleanForeground': X.number,
  'symbolIcon.classForeground': X.type,
  'symbolIcon.colorForeground': X.number,
  'symbolIcon.constantForeground': X.number,
  'symbolIcon.constructorForeground': X.function,
  'symbolIcon.enumeratorForeground': X.type,
  'symbolIcon.enumeratorMemberForeground': X.property,
  'symbolIcon.eventForeground': X.decorator,
  'symbolIcon.fieldForeground': X.property,
  'symbolIcon.fileForeground': F.secondary,
  'symbolIcon.folderForeground': F.secondary,
  'symbolIcon.functionForeground': X.function,
  'symbolIcon.interfaceForeground': X.type,
  'symbolIcon.keyForeground': X.property,
  'symbolIcon.keywordForeground': X.keyword,
  'symbolIcon.methodForeground': X.function,
  'symbolIcon.moduleForeground': X.type,
  'symbolIcon.namespaceForeground': X.type,
  'symbolIcon.nullForeground': X.number,
  'symbolIcon.numberForeground': X.number,
  'symbolIcon.objectForeground': X.property,
  'symbolIcon.operatorForeground': X.operator,
  'symbolIcon.packageForeground': X.type,
  'symbolIcon.propertyForeground': X.property,
  'symbolIcon.referenceForeground': S.accent,
  'symbolIcon.snippetForeground': F.secondary,
  'symbolIcon.stringForeground': X.string,
  'symbolIcon.structForeground': X.type,
  'symbolIcon.textForeground': F.primary,
  'symbolIcon.typeParameterForeground': X.type,
  'symbolIcon.unitForeground': X.number,
  'symbolIcon.variableForeground': X.variable,
});

set({
  'tab.activeBackground': N.editorBg,
  'tab.activeForeground': F.primary,
  'tab.activeBorder': N.editorBg,
  'tab.activeBorderTop': S.accent,
  'tab.activeModifiedBorder': S.gitModified,
  'tab.border': N.border,
  'tab.lastPinnedBorder': N.indentGuideActive,
  'tab.inactiveBackground': N.chromeBg,
  'tab.inactiveForeground': F.mutedOnChrome,
  'tab.inactiveModifiedBorder': S.gitModified,
  'tab.hoverBackground': N.hoverBg,
  'tab.hoverBorder': S.accent,
  'tab.hoverForeground': F.primary,
  'tab.unfocusedActiveBackground': N.chromeBg,
  'tab.unfocusedActiveForeground': F.secondary,
  'tab.unfocusedActiveBorder': N.border,
  'tab.unfocusedActiveBorderTop': N.indentGuideActive,
  'tab.unfocusedActiveModifiedBorder': mix(S.gitModified, N.chromeBg, 0.45),
  'tab.unfocusedInactiveBackground': N.panelBg,
  'tab.unfocusedInactiveForeground': F.muted,
  'tab.unfocusedInactiveModifiedBorder': mix(S.gitModified, N.chromeBg, 0.65),
  'tab.unfocusedHoverBackground': N.hoverBg,
  'tab.unfocusedHoverBorder': N.indentGuideActive,
  'tab.unfocusedHoverForeground': F.secondary,
});

set({
  'terminal.background': N.panelBg,
  'terminal.foreground': F.primary,
  'terminal.border': N.border,
  'terminal.dropBackground': N.selectionBg,
  'terminal.selectionBackground': N.selectionBg,
  'terminal.tab.activeBorder': S.accent,
  'terminalCursor.foreground': S.cursor,
  'terminalCursor.background': N.editorBg,
  'terminal.ansiBlack': N.well,
  'terminal.ansiRed': S.error,
  'terminal.ansiGreen': S.gitAdded,
  'terminal.ansiYellow': S.warning,
  'terminal.ansiBlue': S.accent,
  'terminal.ansiMagenta': X.keyword,
  'terminal.ansiCyan': X.property,
  'terminal.ansiWhite': F.secondary,
  'terminal.ansiBrightBlack': F.muted,
  'terminal.ansiBrightRed': D.bright(S.error),
  'terminal.ansiBrightGreen': D.bright(S.gitAdded),
  'terminal.ansiBrightYellow': D.bright(S.warning),
  'terminal.ansiBrightBlue': D.bright(S.accent),
  'terminal.ansiBrightMagenta': D.bright(X.keyword),
  'terminal.ansiBrightCyan': D.bright(X.property),
  'terminal.ansiBrightWhite': F.primary,
});

set({
  'testing.iconErrored': S.error,
  'testing.iconFailed': S.error,
  'testing.iconPassed': S.gitAdded,
  'testing.iconQueued': S.warning,
  'testing.iconSkipped': F.muted,
  'testing.iconUnset': F.muted,
  'testing.runAction': S.gitAdded,
  'testing.peekBorder': S.error,
  'testing.peekHeaderBackground': N.chromeBg,
  'testing.message.error.decorationForeground': S.error,
  'testing.message.error.lineBackground': D.errorWash,
  'testing.message.info.decorationForeground': S.info,
  'testing.message.info.lineBackground': D.infoWash,
});

set({
  'titleBar.activeBackground': N.chromeBg,
  'titleBar.activeForeground': F.secondary,
  'titleBar.inactiveBackground': N.panelBg,
  'titleBar.inactiveForeground': F.muted,
  'titleBar.border': N.border,
  'toolbar.activeBackground': N.selectionBg,
  'toolbar.hoverBackground': N.hoverBg,
  'toolbar.hoverOutline': S.accent,
  'window.activeBorder': N.border,
  'window.inactiveBorder': N.border,
  'walkThrough.embeddedEditorBackground': N.well,
  'welcomePage.background': N.editorBg,
  'welcomePage.buttonBackground': N.chromeBg,
  'welcomePage.buttonHoverBackground': N.hoverBg,
  'welcomePage.progress.background': N.inactiveSelBg,
  'welcomePage.progress.foreground': S.accent,
  'welcomePage.tileBackground': N.panelBg,
  'welcomePage.tileHoverBackground': N.hoverBg,
  'welcomePage.tileShadow.': N.well,
});

// ------------------------------------------------------------- tokenColors
const t = (name, scope, foreground, fontStyle) => {
  const s = { name, scope, settings: { foreground } };
  if (fontStyle) s.settings.fontStyle = fontStyle;
  return s;
};

const tokenColors = [
  t('Comment', [
    'comment', 'punctuation.definition.comment', 'string.comment',
    'comment.block.documentation', 'comment.line',
  ], X.comment, 'italic'),

  t('Keyword / control flow / storage', [
    'keyword', 'keyword.control', 'keyword.other', 'keyword.control.flow',
    'keyword.control.import', 'keyword.control.export', 'keyword.control.from',
    'keyword.control.as', 'keyword.control.default', 'keyword.control.trycatch',
    'keyword.control.conditional', 'keyword.control.loop',
    'storage', 'storage.type', 'storage.modifier',
    'meta.import keyword', 'meta.export keyword',
    'variable.language.this', 'variable.language.super',
    'keyword.other.new', 'keyword.operator.new',
    'keyword.operator.expression', 'keyword.operator.of', 'keyword.operator.in',
    'keyword.operator.instanceof', 'keyword.operator.typeof',
    'keyword.operator.delete', 'keyword.operator.void',
  ], X.keyword, 'italic'),

  t('Operator', [
    'keyword.operator', 'keyword.operator.assignment', 'keyword.operator.arithmetic',
    'keyword.operator.comparison', 'keyword.operator.logical',
    'keyword.operator.bitwise', 'keyword.operator.ternary',
    'keyword.operator.arrow', 'keyword.operator.spread',
    'keyword.operator.optional', 'keyword.operator.definiteassignment',
    'storage.type.function.arrow',
  ], X.operator),

  t('String', [
    'string', 'string.quoted', 'string.quoted.single', 'string.quoted.double',
    'string.template', 'string.other.link',
    'punctuation.definition.string', 'meta.attribute-selector string',
  ], X.string),

  t('Template literal punctuation', [
    'punctuation.definition.template-expression',
    'punctuation.section.embedded',
    'meta.template.expression punctuation.definition',
    'meta.embedded.line',
  ], X.templatePunct),

  t('Number / boolean / null / constant', [
    'constant.numeric', 'constant.language', 'constant.language.boolean',
    'constant.language.null', 'constant.language.undefined', 'constant.language.nan',
    'constant.language.infinity', 'constant.character', 'constant.character.escape',
    'constant.other', 'support.constant', 'variable.other.constant',
    'entity.name.constant',
  ], X.number),

  t('Function / method', [
    'entity.name.function', 'support.function', 'meta.function-call entity.name.function',
    'meta.function-call.generic', 'variable.function',
    'entity.name.function.member', 'support.function.dom',
    'meta.definition.method entity.name.function',
  ], X.function),

  t('Class / interface / type / enum', [
    'entity.name.type', 'entity.name.class', 'entity.name.interface',
    'entity.name.type.class', 'entity.name.type.interface', 'entity.name.type.enum',
    'entity.name.type.alias', 'entity.name.type.module', 'entity.name.namespace',
    'support.type', 'support.class', 'support.type.primitive',
    'entity.other.inherited-class', 'meta.type.annotation entity.name.type',
    'entity.name.type.parameter', 'storage.type.class',
  ], X.type),

  t('Variable', [
    'variable', 'variable.other', 'variable.other.readwrite',
    'meta.definition.variable variable.other', 'variable.other.object',
    'support.variable',
  ], X.variable),

  t('Parameter', [
    'variable.parameter', 'meta.parameters variable.other',
    'meta.function.parameters variable', 'variable.parameter.function',
  ], X.parameter, 'italic'),

  t('Object property / key', [
    'variable.other.property', 'variable.other.object.property',
    'meta.object-literal.key', 'support.type.property-name',
    'variable.object.property', 'meta.property-name',
    'entity.name.variable.field', 'variable.other.enummember',
  ], X.property),

  t('Punctuation / braces / delimiters', [
    'punctuation', 'punctuation.separator', 'punctuation.terminator',
    'punctuation.accessor', 'punctuation.definition.block',
    'punctuation.definition.parameters', 'punctuation.definition.array',
    'punctuation.definition.binding-pattern', 'meta.brace',
    'punctuation.section.block', 'punctuation.definition.entity.css',
  ], X.punctuation),

  t('Decorator', [
    'meta.decorator', 'entity.name.function.decorator',
    'punctuation.decorator', 'meta.decorator variable.other',
    'meta.decorator punctuation.decorator',
  ], X.decorator, 'italic'),

  t('Regular expression', [
    'string.regexp', 'constant.other.character-class.regexp',
    'keyword.operator.quantifier.regexp', 'punctuation.definition.group.regexp',
    'constant.character.escape.backslash.regexp',
  ], X.regex),

  t('HTML / JSX intrinsic tag', [
    'entity.name.tag', 'entity.name.tag.html', 'entity.name.tag.js.jsx',
    'support.class.component.jsx.intrinsic',
    'punctuation.definition.tag', 'punctuation.definition.tag.begin',
    'punctuation.definition.tag.end', 'meta.tag punctuation.definition.tag',
  ], X.tagIntrinsic),

  t('JSX component tag', [
    'support.class.component', 'entity.name.tag.jsx-component',
    'meta.tag.attributes support.class.component',
    'entity.name.tag.namespace',
  ], X.tagComponent),

  t('Attribute name', [
    'entity.other.attribute-name', 'entity.other.attribute-name.html',
    'entity.other.attribute-name.jsx', 'meta.tag entity.other.attribute-name',
    'meta.directive.vue entity.other.attribute-name',
  ], X.attribute),

  t('CSS selector', [
    'entity.name.tag.css', 'entity.other.attribute-name.class.css',
    'entity.other.attribute-name.id.css', 'entity.other.attribute-name.pseudo-class.css',
    'entity.other.attribute-name.pseudo-element.css', 'meta.selector',
    'entity.other.attribute-name.parent-selector.css',
  ], X.cssSelector),

  t('CSS property name', [
    'support.type.property-name.css', 'meta.property-name.css',
    'support.type.vendored.property-name.css', 'support.type.property-name.scss',
  ], X.cssProperty),

  t('CSS property value', [
    'support.constant.property-value.css', 'meta.property-value.css',
    'support.constant.font-name.css', 'support.constant.color.w3c-standard-color-name.css',
  ], X.cssValue),

  t('CSS numeric / unit', [
    'constant.numeric.css', 'keyword.other.unit.css',
    'constant.other.color.rgb-value.css', 'constant.other.unicode-range.css',
  ], X.cssUnit),

  t('Markdown heading', [
    'markup.heading', 'entity.name.section.markdown',
    'punctuation.definition.heading.markdown',
  ], X.function, 'bold'),
  t('Markdown bold', ['markup.bold'], X.type, 'bold'),
  t('Markdown italic', ['markup.italic'], X.keyword, 'italic'),
  t('Markdown inline code', ['markup.inline.raw', 'markup.fenced_code'], X.string),
  t('Markdown link', ['markup.underline.link', 'string.other.link.title.markdown'], S.accent),
  t('Markdown list punctuation', [
    'punctuation.definition.list.begin.markdown',
    'beginning.punctuation.definition.list.markdown',
  ], X.punctuation),

  t('Diff inserted', ['markup.inserted'], S.gitAdded),
  t('Diff deleted', ['markup.deleted'], S.gitRemoved),
  t('Diff changed', ['markup.changed'], S.gitModified),

  t('JSON key', [
    'support.type.property-name.json', 'string.json support.type.property-name',
  ], X.property),
  t('YAML key', ['entity.name.tag.yaml', 'string.unquoted.plain.out.yaml'], X.property),

  t('Invalid / illegal', ['invalid', 'invalid.illegal'], X.invalid),
  t('Deprecated', ['invalid.deprecated'], X.deprecated, 'italic underline'),
];

// ---------------------------------------------------------- semantic tokens
const semanticTokenColors = {
  parameter: { foreground: X.parameter, fontStyle: 'italic' },
  property: { foreground: X.property },
  variable: { foreground: X.variable },
  'variable.readonly': { foreground: X.number },
  function: { foreground: X.function },
  method: { foreground: X.function },
  class: { foreground: X.type },
  interface: { foreground: X.type },
  enum: { foreground: X.type },
  enumMember: { foreground: X.property },
  type: { foreground: X.type },
  typeParameter: { foreground: X.type },
  namespace: { foreground: X.type },
  keyword: { foreground: X.keyword, fontStyle: 'italic' },
  string: { foreground: X.string },
  number: { foreground: X.number },
  comment: { foreground: X.comment, fontStyle: 'italic' },
  decorator: { foreground: X.decorator, fontStyle: 'italic' },
  operator: { foreground: X.operator },
};

// --------------------------------------------------------- completeness gate
const required = Object.keys(BASELINE.colors);
const missing = required.filter(k => !(k in c));
const extra = Object.keys(c).filter(k => !required.includes(k));

if (missing.length) {
  console.error(`\nBUILD FAILED: ${missing.length} baseline key(s) unassigned:\n`);
  missing.forEach(k => console.error('  ' + k));
  process.exit(1);
}

// Emit in the baseline's key order so diffs against upstream stay readable.
const colors = {};
for (const k of required) colors[k] = c[k];
for (const k of extra) colors[k] = c[k];

const theme = {
  name: 'Violet Hour',
  type: 'dark',
  semanticHighlighting: true,
  colors,
  semanticTokenColors,
  tokenColors,
};

fs.writeFileSync(path.join(ROOT, 'theme/VioletHour.json'), JSON.stringify(theme, null, 2) + '\n');

console.log('Violet Hour built -> theme/VioletHour.json');
console.log(`  workbench colors : ${Object.keys(colors).length} (${required.length} required, ${extra.length} extra)`);
console.log(`  tokenColors      : ${tokenColors.length} rules, ${tokenColors.reduce((n, r) => n + r.scope.length, 0)} scopes`);
console.log(`  semantic tokens  : ${Object.keys(semanticTokenColors).length}`);
