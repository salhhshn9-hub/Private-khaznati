import ExcelJS from 'exceljs';
import { VaultAccount } from '../types/vault';
import {
  CATEGORY_LABELS,
  CURRENCY_LABELS,
  GENDER_LABELS,
  LOGIN_METHOD_LABELS,
  SITE_SIGNUP_METHOD_LABELS,
  SITE_STATUS_LABELS,
  STATUS_LABELS,
  SUBSCRIPTION_LABELS,
  TWO_FACTOR_LABELS,
  buildVaultAuditReport,
  calculateAccountDuration,
  evaluatePasswordStrength,
  formatReadableDate,
} from './vaultHelpers';

export interface ExcelExportOptions {
  accounts: VaultAccount[];
  realBirthdate: string;
  ownerUsername: string;
  includeSecrets: boolean;
  scopeLabel?: string;
  customFileSuffix?: string;
  sheets: {
    summary: boolean;
    hierarchy: boolean;
    accounts: boolean;
    sites: boolean;
    subscriptions: boolean;
    historyAndFields: boolean;
    recovery: boolean;
  };
}

// Royal Executive Palette (ARGB)
const PALETTE = {
  obsidian: 'FF0F172A',
  royalIndigo: 'FF1E1B4B',
  indigoDeep: 'FF312E81',
  indigoAccent: 'FF4F46E5',
  indigoSoft: 'FFEEF2FF',
  indigoRowTint: 'FFE0E7FF',
  goldDark: 'FF92400E',
  goldAccent: 'FFD97706',
  goldSoft: 'FFFEF3C7',
  tealDeep: 'FF115E59',
  tealSoft: 'FFCCFBF1',
  slateMuted: 'FF475569',
  slateSubtle: 'FFF8FAFC',
  borderLight: 'FFE2E8F0',
  borderMedium: 'FFCBD5E1',
  white: 'FFFFFFFF',
  emeraldText: 'FF065F46',
  emeraldFill: 'FFD1FAE5',
  amberText: 'FF92400E',
  amberFill: 'FFFEF3C7',
  roseText: 'FF9F1239',
  roseFill: 'FFFFE4E6',
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: PALETTE.borderLight } },
  left: { style: 'thin', color: { argb: PALETTE.borderLight } },
  bottom: { style: 'thin', color: { argb: PALETTE.borderLight } },
  right: { style: 'thin', color: { argb: PALETTE.borderLight } },
};

const BORDER_PARENT: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: PALETTE.indigoAccent } },
  bottom: { style: 'thin', color: { argb: PALETTE.indigoAccent } },
  left: { style: 'thin', color: { argb: PALETTE.borderMedium } },
  right: { style: 'thin', color: { argb: PALETTE.borderMedium } },
};

const BORDER_HEADER: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: PALETTE.indigoDeep } },
  bottom: { style: 'medium', color: { argb: PALETTE.goldAccent } },
  left: { style: 'thin', color: { argb: 'FF4338CA' } },
  right: { style: 'thin', color: { argb: 'FF4338CA' } },
};

function configurePrintAndRtl(
  sheet: ExcelJS.Worksheet,
  freezeRow = 4
) {
  sheet.views = [
    {
      rightToLeft: true,
      ...(freezeRow > 0 ? { state: 'frozen', ySplit: freezeRow } : {}),
      showGridLines: true,
    },
  ];
  sheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.45,
      bottom: 0.45,
      header: 0.25,
      footer: 0.25,
    },
  };
  sheet.properties.defaultRowHeight = 24;
}

function applyRtlAndTitleBanner(
  sheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  columnCount: number,
  freezeRow = 4
) {
  configurePrintAndRtl(sheet, freezeRow);

  // Row 1: Top Royal Obsidian Banner
  const titleRow = sheet.getRow(1);
  titleRow.height = 38;
  sheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: PALETTE.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.obsidian } };
  titleCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
  titleCell.border = { bottom: { style: 'medium', color: { argb: PALETTE.goldAccent } } };

  // Row 2: Subtitle Bar
  const subRow = sheet.getRow(2);
  subRow.height = 24;
  sheet.mergeCells(2, 1, 2, columnCount);
  const subCell = sheet.getCell(2, 1);
  subCell.value = subtitle;
  subCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.indigoDeep } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.indigoSoft } };
  subCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

  // Row 3: Spacer
  sheet.getRow(3).height = 8;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 32;
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: PALETTE.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.royalIndigo } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDER_HEADER;
  });
}

function calculateDynamicRowHeight(row: ExcelJS.Row, minHeight = 25): number {
  let maxLines = 1;
  row.eachCell({ includeEmpty: false }, (cell) => {
    const val = cell.value;
    const text =
      val && typeof val === 'object' && 'text' in val
        ? String((val as ExcelJS.CellHyperlinkValue).text)
        : val === null || val === undefined
          ? ''
          : String(val);
    if (!text) return;
    const explicitLines = text.split('\n');
    let count = 0;
    for (const part of explicitLines) {
      count += Math.max(1, Math.ceil(part.length / 32));
    }
    if (count > maxLines) maxLines = count;
  });
  return Math.min(135, Math.max(minHeight, maxLines * 16 + 10));
}

function styleDataRow(row: ExcelJS.Row, rowIndex: number) {
  const bg = rowIndex % 2 === 1 ? PALETTE.white : PALETTE.slateSubtle;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: 'Calibri', size: 10.5, color: { argb: PALETTE.obsidian } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    cell.border = BORDER_THIN;
  });
  row.height = calculateDynamicRowHeight(row, 25);
}

function styleParentTreeRow(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.indigoDeep } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.indigoRowTint } };
    cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    cell.border = BORDER_PARENT;
  });
  row.height = calculateDynamicRowHeight(row, 30);
}

function applyBadgeStyle(
  cell: ExcelJS.Cell,
  tone: 'emerald' | 'amber' | 'rose' | 'indigo' | 'gold'
) {
  const map = {
    emerald: { text: PALETTE.emeraldText, fill: PALETTE.emeraldFill },
    amber: { text: PALETTE.amberText, fill: PALETTE.amberFill },
    rose: { text: PALETTE.roseText, fill: PALETTE.roseFill },
    indigo: { text: PALETTE.indigoDeep, fill: PALETTE.indigoSoft },
    gold: { text: PALETTE.goldDark, fill: PALETTE.goldSoft },
  }[tone];

  cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: map.text } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: map.fill } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

function setHyperlinkIfValid(cell: ExcelJS.Cell, rawUrl: string) {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    cell.value = '—';
    return;
  }
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  cell.value = { text: trimmed, hyperlink: normalized };
  cell.font = {
    name: 'Consolas',
    size: 9.5,
    underline: true,
    color: { argb: PALETTE.indigoAccent },
  };
}

function autoFitColumns(sheet: ExcelJS.Worksheet, minWidth = 13, maxWidth = 40) {
  sheet.columns.forEach((col) => {
    let maxLen = minWidth;
    if (col.eachCell) {
      col.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.row && Number(cell.row) <= 2) return;
        const val = cell.value;
        const raw =
          val && typeof val === 'object' && 'text' in val
            ? String((val as ExcelJS.CellHyperlinkValue).text)
            : val && typeof val === 'object' && 'formula' in val
              ? '123456.00'
              : val === null || val === undefined
                ? ''
                : String(val);
        const lines = raw.split('\n');
        for (const line of lines) {
          const len = line.length + 5;
          if (len > maxLen) maxLen = len;
        }
      });
    }
    col.width = Math.min(maxWidth, Math.max(minWidth, maxLen));
  });
}

function getDaysUntil(dateStr: string): number | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const target = new Date(`${dateStr}T00:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatSecret(value: string, includeSecrets: boolean, emptyText = '—'): string {
  if (!value) return emptyText;
  if (includeSecrets) return value;
  return value.length <= 2 ? '••••' : `${value.slice(0, 2)}••••••••`;
}

export async function exportLuxuryExcelWorkbook(options: ExcelExportOptions): Promise<void> {
  const {
    accounts,
    realBirthdate,
    ownerUsername,
    includeSecrets,
    scopeLabel,
    customFileSuffix,
    sheets,
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'خَزْنَتِي';
  workbook.created = new Date();
  workbook.modified = new Date();

  const todayStr = new Date().toISOString().slice(0, 10);
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const emailIdentities = accounts.filter((a) => a.recordType === 'email');
  const emailByAddress = new Map(
    emailIdentities
      .filter((a) => a.emailAddress.trim())
      .map((a) => [a.emailAddress.trim().toLowerCase(), a])
  );
  const auditReport = buildVaultAuditReport(accounts, realBirthdate);

  const exportModeLabel = includeSecrets
    ? 'تصدير شامل كامل (يتضمن جميع كلمات المرور، رموز PIN، مفاتيح 2FA، والأكواد الاحتياطية)'
    : 'نسخة آمنة بدون أسرار (للمراجعة والطباعة)';

  const scopeNote = scopeLabel ? `  |  النطاق: ${scopeLabel}` : '';
  const subtitleText = `المالك: @${ownerUsername}  |  التاريخ: ${todayStr.replace(/-/g, '/')}  |  الميلاد المرجعي: ${formatReadableDate(realBirthdate)}${scopeNote}  |  ${exportModeLabel}`;

  // ============================================================================
  // SHEET 1: الملخص التنفيذي
  // ============================================================================
  if (sheets.summary) {
    const ws = workbook.addWorksheet('الملخص التنفيذي', {
      properties: { tabColor: { argb: PALETTE.indigoAccent } },
    });

    applyRtlAndTitleBanner(
      ws,
      'خَزْنَتِي — التقرير التنفيذي الموثّق للخزنة والهويات الرقمية',
      subtitleText,
      6,
      0
    );

    const emailCount = emailIdentities.length;
    const appCount = accounts.length - emailCount;
    const siteItemsCount = accounts.reduce((s, a) => s + (a.registeredSites?.length || 0), 0);
    const twoFactorCount = accounts.filter((a) => a.twoFactorEnabled).length;
    const passkeyCount = accounts.filter((a) => a.passkeyEnabled).length;
    const totpCount = accounts.filter((a) => Boolean(a.totpSecret?.trim())).length;
    const historyCount = accounts.reduce((s, a) => s + (a.passwordHistory?.length || 0), 0);
    const customFieldsCount = accounts.reduce((s, a) => s + (a.customFields?.length || 0), 0);

    const kpiTitleRow = ws.getRow(4);
    kpiTitleRow.height = 28;
    ws.mergeCells(4, 1, 4, 3);
    ws.getCell(4, 1).value = 'مؤشرات الخزنة الشاملة';
    ws.getCell(4, 1).font = { name: 'Calibri', size: 12, bold: true, color: { argb: PALETTE.white } };
    ws.getCell(4, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.royalIndigo } };
    ws.getCell(4, 1).alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

    ws.mergeCells(4, 4, 4, 6);
    ws.getCell(4, 4).value = 'التدقيق الأمني وتطابق التواريخ';
    ws.getCell(4, 4).font = { name: 'Calibri', size: 12, bold: true, color: { argb: PALETTE.white } };
    ws.getCell(4, 4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.royalIndigo } };
    ws.getCell(4, 4).alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

    const leftMetrics: [string, number, string][] = [
      ['إجمالي السجلات المحفوظة', accounts.length, 'بريد وتطبيق'],
      ['الإيميلات الرئيسية (الهويات الأم)', emailCount, 'بريد أساسي'],
      ['التطبيقات المستقلة', appCount, 'تطبيق'],
      ['المواقع والتطبيقات المسجّلة داخل الحسابات', siteItemsCount, 'موقع وتطبيق فرعي'],
      ['الحسابات المحمية بالتحقق بخطوتين (2FA)', twoFactorCount, `${accounts.length ? Math.round((twoFactorCount / accounts.length) * 100) : 0}% تغطية`],
      ['مفاتيح 2FA حية (TOTP) + بصمة Passkey', totpCount + passkeyCount, `${totpCount} TOTP / ${passkeyCount} Passkey`],
      ['سجل كلمات المرور السابقة والحقول المخصصة', historyCount + customFieldsCount, `${historyCount} سابقة / ${customFieldsCount} مخصصة`],
    ];

    const rightAudit: [string, number, 'emerald' | 'amber' | 'rose'][] = [
      ['مجموعات كلمات المرور المكررة', auditReport.reusedPasswordGroups.length, auditReport.reusedPasswordGroups.length > 0 ? 'rose' : 'emerald'],
      ['كلمات المرور الضعيفة', auditReport.weakPasswordAccounts.length, auditReport.weakPasswordAccounts.length > 0 ? 'rose' : 'emerald'],
      ['تعارضات تواريخ الميلاد المسجلة', auditReport.birthdateMismatches.length, auditReport.birthdateMismatches.length > 0 ? 'amber' : 'emerald'],
      ['حسابات نشطة بدون تحقق بخطوتين', auditReport.noTwoFactorAccounts.length, auditReport.noTwoFactorAccounts.length > 0 ? 'amber' : 'emerald'],
      ['كلمات مرور قديمة (+180 يوماً)', auditReport.oldPasswordAccounts.length, auditReport.oldPasswordAccounts.length > 0 ? 'amber' : 'emerald'],
      ['حسابات ينقصها الميلاد أو الإنشاء', auditReport.missingDatesAccounts.length, auditReport.missingDatesAccounts.length > 0 ? 'amber' : 'emerald'],
      ['حسابات بحالة "تحتاج تحديث"', accounts.filter((a) => a.status === 'needs_update').length, accounts.some((a) => a.status === 'needs_update') ? 'amber' : 'emerald'],
    ];

    for (let i = 0; i < leftMetrics.length; i++) {
      const rowNum = 5 + i;
      const r = ws.getRow(rowNum);
      const [lLabel, lVal, lUnit] = leftMetrics[i];
      const [rLabel, rVal, rTone] = rightAudit[i];

      r.getCell(1).value = lLabel;
      r.getCell(2).value = lVal;
      r.getCell(3).value = lUnit;

      r.getCell(4).value = rLabel;
      r.getCell(5).value = rVal;
      r.getCell(6).value = rVal === 0 ? 'سليم 100%' : 'يستدعي المراجعة';

      styleDataRow(r, i + 1);
      r.getCell(2).font = { name: 'Consolas', size: 11, bold: true, color: { argb: PALETTE.indigoDeep } };
      r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(5).font = { name: 'Consolas', size: 11, bold: true, color: { argb: PALETTE.obsidian } };
      r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      applyBadgeStyle(r.getCell(6), rTone);
    }

    // Category Breakdown Table with SUM formulas
    ws.getRow(13).height = 12;
    const catHeader = ws.getRow(14);
    catHeader.height = 28;
    ws.mergeCells(14, 1, 14, 5);
    ws.getCell(14, 1).value = 'توزيع السجلات والتغطية حسب التصنيف';
    ws.getCell(14, 1).font = { name: 'Calibri', size: 12, bold: true, color: { argb: PALETTE.white } };
    ws.getCell(14, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.obsidian } };
    ws.getCell(14, 1).alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

    const catCols = ws.getRow(15);
    catCols.values = ['التصنيف', 'عدد الحسابات', 'محمية بـ 2FA', 'المواقع المرتبطة', 'الحقول المخصصة'];
    styleHeaderRow(catCols);

    const catEntries = Object.entries(CATEGORY_LABELS);
    const startCatRow = 16;
    let catRowIdx = startCatRow;
    for (const [catKey, catLabel] of catEntries) {
      const catAccs = accounts.filter((a) => a.category === catKey);
      if (catAccs.length === 0) continue;
      const r = ws.getRow(catRowIdx);
      const tfa = catAccs.filter((a) => a.twoFactorEnabled).length;
      const sitesCnt = catAccs.reduce((s, a) => s + (a.registeredSites?.length || 0), 0);
      const cfCnt = catAccs.reduce((s, a) => s + (a.customFields?.length || 0), 0);
      r.values = [catLabel, catAccs.length, tfa, sitesCnt, cfCnt];
      styleDataRow(r, catRowIdx);
      [2, 3, 4, 5].forEach((c) => {
        r.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(c).font = { name: 'Consolas', size: 10.5, bold: true, color: { argb: PALETTE.obsidian } };
      });
      catRowIdx++;
    }

    if (catRowIdx > startCatRow) {
      const totalRow = ws.getRow(catRowIdx);
      const endCatRow = catRowIdx - 1;
      totalRow.getCell(1).value = 'الإجمالي الكلي';
      totalRow.getCell(2).value = { formula: `SUM(B${startCatRow}:B${endCatRow})` };
      totalRow.getCell(3).value = { formula: `SUM(C${startCatRow}:C${endCatRow})` };
      totalRow.getCell(4).value = { formula: `SUM(D${startCatRow}:D${endCatRow})` };
      totalRow.getCell(5).value = { formula: `SUM(E${startCatRow}:E${endCatRow})` };
      totalRow.height = 28;
      totalRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.indigoDeep } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.goldSoft } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_PARENT;
      });
      totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
    }

    ws.columns = [
      { width: 38 },
      { width: 16 },
      { width: 24 },
      { width: 38 },
      { width: 16 },
      { width: 22 },
    ];
  }

  // ============================================================================
  // SHEET 2: الشجرة الشاملة (كل بريد مع كل ما بداخله بالكامل)
  // ============================================================================
  if (sheets.hierarchy) {
    const ws = workbook.addWorksheet('الشجرة الشاملة', {
      properties: { tabColor: { argb: PALETTE.goldAccent } },
    });

    const headers = [
      '#',
      'المستوى / الهيكل',
      'الاسم / المنصة',
      'البريد الإلكتروني',
      'اسم المستخدم',
      'كلمة المرور الكاملة',
      'رمز PIN',
      'التحقق بخطوتين ومفتاح 2FA',
      'تاريخ الميلاد المسجّل',
      'تاريخ الإنشاء / العمر',
      'طريقة الدخول / التسجيل',
      'رقم الجوال',
      'الجهاز المستخدم',
      'البطاقة / الاشتراك',
      'بريد وجوال الاسترداد / الطوارئ',
      'الحقول المخصصة',
      'الرابط',
      'الملاحظات الكاملة',
    ];

    applyRtlAndTitleBanner(
      ws,
      'الشجرة الكاملة للخزنة — كل بريد إلكتروني وما بداخله من تطبيقات ومواقع وكلمات مرور',
      subtitleText,
      headers.length,
      4
    );

    const headerRow = ws.getRow(4);
    headerRow.values = headers;
    styleHeaderRow(headerRow);

    const childrenByEmailId = new Map<string, VaultAccount[]>();
    emailIdentities.forEach((em) => childrenByEmailId.set(em.id, []));
    const standaloneApps: VaultAccount[] = [];

    for (const acc of accounts) {
      if (acc.recordType === 'email') continue;
      let parent: VaultAccount | undefined;
      if (acc.parentEmailId && accountById.has(acc.parentEmailId)) {
        parent = accountById.get(acc.parentEmailId);
      } else if (acc.emailAddress.trim()) {
        parent = emailByAddress.get(acc.emailAddress.trim().toLowerCase());
      }
      if (parent && childrenByEmailId.has(parent.id)) {
        childrenByEmailId.get(parent.id)!.push(acc);
      } else {
        standaloneApps.push(acc);
      }
    }

    let rowCursor = 5;
    let seq = 1;

    const writeAccountRow = (
      acc: VaultAccount,
      levelLabel: string,
      isParentStyle: boolean,
      parentEmailHint?: string
    ) => {
      const r = ws.getRow(rowCursor++);
      const dur = calculateAccountDuration(acc.accountCreatedAt);
      const tfaSummary = acc.twoFactorEnabled
        ? `${TWO_FACTOR_LABELS[acc.twoFactorMethod]}${acc.totpSecret ? ` | TOTP: ${formatSecret(acc.totpSecret, includeSecrets)}` : ''}`
        : 'غير مفعل';
      const customText =
        (acc.customFields || []).length > 0
          ? acc.customFields
              .map((cf) => `${cf.label}: ${cf.isSecret ? formatSecret(cf.value, includeSecrets) : cf.value}`)
              .join('\n')
          : '—';
      const recoveryText = [
        acc.recoveryEmail ? `استرداد: ${acc.recoveryEmail}` : '',
        acc.recoveryPhone ? `جوال: ${acc.recoveryPhone}` : '',
        acc.recoveryContactPerson ? `جهة اتصال: ${acc.recoveryContactPerson}` : '',
        acc.backupCodes ? `أكواد: ${includeSecrets ? acc.backupCodes.replace(/\n/g, ', ') : 'محفوظة'}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const subText = [
        acc.subscriptionCost || (acc.subscriptionAmount > 0 ? `${acc.subscriptionAmount} ${acc.subscriptionCurrency}` : ''),
        acc.renewalDate ? `يجدد: ${formatReadableDate(acc.renewalDate)}` : '',
        acc.linkedPaymentHint ? `دفع: ${acc.linkedPaymentHint}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      r.values = [
        seq++,
        levelLabel,
        acc.title,
        acc.emailAddress || parentEmailHint || '—',
        acc.username || acc.displayName || '—',
        formatSecret(acc.password, includeSecrets),
        formatSecret(acc.pinCode, includeSecrets),
        tfaSummary,
        formatReadableDate(acc.registeredBirthdate),
        acc.accountCreatedAt
          ? `${formatReadableDate(acc.accountCreatedAt)}${acc.createdDateApproximate ? ' ~' : ''}${dur ? ` (${dur.label})` : ''}`
          : '—',
        LOGIN_METHOD_LABELS[acc.loginMethod],
        acc.phoneNumber || '—',
        [acc.primaryDevice, ...(acc.trustedDevices || [])].filter(Boolean).join(' · ') || '—',
        subText || '—',
        recoveryText || '—',
        customText,
        acc.websiteUrl || '—',
        [acc.creationContext ? `سياق: ${acc.creationContext}` : '', acc.notes].filter(Boolean).join('\n') || '—',
      ];

      if (isParentStyle) {
        styleParentTreeRow(r);
      } else {
        styleDataRow(r, rowCursor);
      }

      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      [4, 5, 6, 7, 9, 10, 12].forEach((c) => {
        r.getCell(c).font = {
          name: 'Consolas',
          size: isParentStyle ? 10.5 : 10,
          bold: isParentStyle,
          color: { argb: isParentStyle ? PALETTE.indigoDeep : PALETTE.obsidian },
        };
      });
      setHyperlinkIfValid(r.getCell(17), acc.websiteUrl);
      applyBadgeStyle(r.getCell(2), isParentStyle ? 'indigo' : 'gold');
    };

    const writeSitesRows = (parentAcc: VaultAccount, levelLabel: string) => {
      for (const s of parentAcc.registeredSites || []) {
        const r = ws.getRow(rowCursor++);
        const dur = calculateAccountDuration(s.createdAtDate);
        const pwdVal = !s.password
          ? s.signupMethod === 'oauth_button' || s.signupMethod === 'email_same_pwd'
            ? `(نفس كلمة مرور ${parentAcc.title})`
            : '—'
          : formatSecret(s.password, includeSecrets);

        const subText = [
          s.subscriptionCost,
          s.renewalDate ? `يجدد: ${formatReadableDate(s.renewalDate)}` : '',
          s.linkedCardHint ? `بطاقة: ${s.linkedCardHint}` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        r.values = [
          seq++,
          levelLabel,
          s.name,
          parentAcc.emailAddress || '—',
          s.username || s.displayName || '—',
          pwdVal,
          formatSecret(s.pinCode, includeSecrets),
          s.twoFactorEnabled ? s.twoFactorNote || 'مفعل' : 'غير مفعل',
          formatReadableDate(s.registeredBirthdate),
          s.createdAtDate
            ? `${formatReadableDate(s.createdAtDate)}${s.isApproximateDate ? ' ~' : ''}${dur ? ` (${dur.label})` : ''}`
            : '—',
          SITE_SIGNUP_METHOD_LABELS[s.signupMethod],
          s.phoneNumber || '—',
          s.deviceUsed || '—',
          subText || '—',
          `حالة الموقع: ${SITE_STATUS_LABELS[s.status]}`,
          '—',
          s.url || '—',
          s.notes || '—',
        ];
        styleDataRow(r, rowCursor);
        r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        [4, 5, 6, 7, 9, 10, 12].forEach((c) => {
          r.getCell(c).font = { name: 'Consolas', size: 10, color: { argb: PALETTE.obsidian } };
        });
        setHyperlinkIfValid(r.getCell(17), s.url);
      }
    };

    for (const emailAcc of emailIdentities) {
      const childApps = childrenByEmailId.get(emailAcc.id) || [];
      writeAccountRow(emailAcc, 'بريد رئيسي (الأب)', true);
      writeSitesRows(emailAcc, '  └─ موقع مسجّل بالبريد');
      for (const childApp of childApps) {
        writeAccountRow(childApp, '  ├─ تطبيق تابع', false, emailAcc.emailAddress);
        writeSitesRows(childApp, '      └─ موقع فرعي');
      }

      // Per-email subtle summary row
      const summaryRow = ws.getRow(rowCursor++);
      const totalInside =
        (emailAcc.registeredSites?.length || 0) +
        childApps.length +
        childApps.reduce((s, c) => s + (c.registeredSites?.length || 0), 0);
      ws.mergeCells(rowCursor - 1, 1, rowCursor - 1, headers.length);
      summaryRow.getCell(1).value = `ملخص "${emailAcc.title}" (${emailAcc.emailAddress || '—'}): يحتوي على ${childApps.length} تطبيقات مستقلة و ${(emailAcc.registeredSites?.length || 0) + childApps.reduce((s, c) => s + (c.registeredSites?.length || 0), 0)} مواقع مرتبطة (الإجمالي: ${totalInside})`;
      summaryRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.tealDeep } };
      summaryRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.tealSoft } };
      summaryRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle', indent: 2 };
      summaryRow.height = 22;

      // Blank visual breathing row
      const spacer = ws.getRow(rowCursor++);
      spacer.height = 8;
    }

    if (standaloneApps.length > 0) {
      const groupRow = ws.getRow(rowCursor++);
      ws.mergeCells(rowCursor - 1, 1, rowCursor - 1, headers.length);
      groupRow.getCell(1).value = `حسابات وتطبيقات مستقلة (غير مربوطة ببريد داخل الخزنة — ${standaloneApps.length})`;
      groupRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.white } };
      groupRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.slateMuted } };
      groupRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
      groupRow.height = 26;

      for (const app of standaloneApps) {
        writeAccountRow(app, 'تطبيق مستقل', false);
        writeSitesRows(app, '  └─ موقع فرعي');
      }
    }

    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: Math.max(5, rowCursor - 1), column: headers.length },
    };

    autoFitColumns(ws, 14, 38);
    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 22;
  }

  // ============================================================================
  // SHEET 3: الحسابات الرئيسية (كل 32 حقل كامل)
  // ============================================================================
  if (sheets.accounts) {
    const ws = workbook.addWorksheet('الحسابات الرئيسية', {
      properties: { tabColor: { argb: PALETTE.obsidian } },
    });

    const headers = [
      '#',
      'النوع',
      'الحساب / المنصة',
      'التصنيف',
      'الحالة',
      'الحساب الأب',
      'البريد الإلكتروني',
      'اسم المستخدم',
      'الاسم الظاهر',
      'الاسم الكامل المسجّل',
      'الجنس',
      'كلمة المرور',
      'قوة كلمة المرور',
      'رمز PIN',
      'التحقق بخطوتين (2FA)',
      'مفتاح TOTP (Authenticator)',
      'Passkey / البصمة',
      'تاريخ الميلاد المسجّل',
      'تطابق الميلاد',
      'تاريخ الإنشاء',
      'عمر الحساب',
      'سياق الإنشاء',
      'آخر دخول',
      'آخر تغيير كلمة مرور',
      'رقم الجوال',
      'الدولة / المتجر',
      'الجهاز الأساسي',
      'المعرّف الخارجي (ID)',
      'الفواتير والبطاقة المربوطة',
      'الحقول المخصصة',
      'رابط الموقع',
      'الملاحظات',
    ];

    applyRtlAndTitleBanner(
      ws,
      'سجل الحسابات الرئيسية — البيانات الكاملة التفصيلية',
      subtitleText,
      headers.length,
      4
    );

    const headerRow = ws.getRow(4);
    headerRow.values = headers;
    styleHeaderRow(headerRow);
    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + Math.max(1, accounts.length), column: headers.length },
    };

    accounts.forEach((acc, idx) => {
      const r = ws.getRow(5 + idx);
      const parent = acc.parentEmailId ? accountById.get(acc.parentEmailId) : undefined;
      const evalRes = evaluatePasswordStrength(acc.password);
      const dur = calculateAccountDuration(acc.accountCreatedAt);

      const compareBirth = parent?.registeredBirthdate || realBirthdate;
      const birthMismatch = Boolean(
        acc.registeredBirthdate && compareBirth && acc.registeredBirthdate !== compareBirth
      );

      const customFieldsSummary =
        (acc.customFields || []).length > 0
          ? acc.customFields
              .map((cf) => `${cf.label}: ${cf.isSecret ? formatSecret(cf.value, includeSecrets) : cf.value}`)
              .join(' | ')
          : '—';

      const billingSummary = [
        acc.billingEmail ? `فواتير: ${acc.billingEmail}` : '',
        acc.linkedPaymentHint ? `بطاقة: ${acc.linkedPaymentHint}` : '',
        acc.billingAddressHint ? `عنوان: ${acc.billingAddressHint}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      r.values = [
        idx + 1,
        acc.recordType === 'email' ? 'بريد رئيسي' : 'تطبيق / موقع',
        acc.title,
        CATEGORY_LABELS[acc.category],
        STATUS_LABELS[acc.status],
        parent ? parent.title : '—',
        acc.emailAddress || '—',
        acc.username || '—',
        acc.displayName || '—',
        acc.registeredFullName || '—',
        GENDER_LABELS[acc.registeredGender || 'unspecified'],
        formatSecret(acc.password, includeSecrets),
        acc.password ? `${evalRes.label} (${evalRes.entropyBits} بت)` : 'غير مسجلة',
        formatSecret(acc.pinCode, includeSecrets),
        acc.twoFactorEnabled ? TWO_FACTOR_LABELS[acc.twoFactorMethod] : 'غير مفعل',
        formatSecret(acc.totpSecret, includeSecrets),
        acc.passkeyEnabled ? (acc.biometricDevice || 'مفعّل') : 'غير مفعل',
        formatReadableDate(acc.registeredBirthdate),
        acc.registeredBirthdate
          ? birthMismatch
            ? 'مختلف عن المرجع'
            : 'متطابق'
          : 'غير مسجل',
        acc.accountCreatedAt
          ? `${formatReadableDate(acc.accountCreatedAt)}${acc.createdDateApproximate ? ' ~' : ''}`
          : 'غير مسجل',
        dur ? dur.label : '—',
        acc.creationContext || '—',
        formatReadableDate(acc.lastAccessedAt),
        formatReadableDate(acc.lastPasswordChangedAt),
        acc.phoneNumber || '—',
        acc.accountRegion || '—',
        acc.primaryDevice || '—',
        acc.accountExternalId || '—',
        billingSummary || '—',
        customFieldsSummary,
        acc.websiteUrl || '—',
        acc.notes || '—',
      ];

      styleDataRow(r, idx + 1);

      [7, 8, 12, 14, 16, 18, 20, 23, 24, 25, 28].forEach((colIdx) => {
        r.getCell(colIdx).font = {
          name: 'Consolas',
          size: 10,
          color: { argb: PALETTE.obsidian },
        };
      });
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      setHyperlinkIfValid(r.getCell(31), acc.websiteUrl);

      applyBadgeStyle(
        r.getCell(5),
        acc.status === 'active'
          ? 'emerald'
          : acc.status === 'needs_update'
            ? 'amber'
            : 'rose'
      );

      if (acc.password) {
        applyBadgeStyle(
          r.getCell(13),
          evalRes.tier === 'excellent' || evalRes.tier === 'strong'
            ? 'emerald'
            : evalRes.tier === 'fair'
              ? 'amber'
              : 'rose'
        );
      }

      applyBadgeStyle(r.getCell(15), acc.twoFactorEnabled ? 'emerald' : 'amber');
      if (acc.registeredBirthdate) {
        applyBadgeStyle(r.getCell(19), birthMismatch ? 'amber' : 'emerald');
      }
    });

    autoFitColumns(ws, 13, 36);
    ws.getColumn(1).width = 6;
  }

  // ============================================================================
  // SHEET 4: المواقع والتطبيقات المرتبطة
  // ============================================================================
  if (sheets.sites) {
    const ws = workbook.addWorksheet('المواقع والتطبيقات', {
      properties: { tabColor: { argb: 'FF0D9488' } },
    });

    const headers = [
      '#',
      'الموقع / التطبيق',
      'طريقة التسجيل',
      'الحساب / الإيميل الأب',
      'بريد الحساب الأب',
      'اسم المستخدم بالتطبيق',
      'الاسم الظاهر',
      'كلمة المرور الكاملة',
      'تاريخ الميلاد بالموقع',
      'متى سويته؟',
      'عمر الحساب',
      'رقم الجوال المسجّل',
      'رمز PIN',
      '2FA',
      'الجهاز المستخدم',
      'البطاقة المربوطة',
      'الاشتراك / التجديد',
      'الحالة',
      'الرابط',
      'ملاحظات',
    ];

    applyRtlAndTitleBanner(
      ws,
      'دليل المواقع والتطبيقات المنشأة بكل حساب وإيميل',
      subtitleText,
      headers.length,
      4
    );

    const headerRow = ws.getRow(4);
    headerRow.values = headers;
    styleHeaderRow(headerRow);

    interface SiteRowData {
      name: string;
      method: string;
      parentTitle: string;
      parentEmail: string;
      username: string;
      displayName: string;
      password: string;
      birthdate: string;
      createdDate: string;
      isApprox: boolean;
      phone: string;
      pin: string;
      tfa: boolean;
      tfaNote: string;
      device: string;
      card: string;
      subInfo: string;
      status: string;
      url: string;
      notes: string;
    }

    const siteRows: SiteRowData[] = [];
    for (const acc of accounts) {
      if (acc.recordType === 'app') {
        const parent =
          (acc.parentEmailId ? accountById.get(acc.parentEmailId) : undefined) ||
          (acc.emailAddress ? emailByAddress.get(acc.emailAddress.trim().toLowerCase()) : undefined);
        siteRows.push({
          name: acc.title,
          method: `سجل كامل (${LOGIN_METHOD_LABELS[acc.loginMethod]})`,
          parentTitle: parent ? parent.title : 'حساب مستقل',
          parentEmail: parent?.emailAddress || acc.emailAddress || '—',
          username: acc.username,
          displayName: acc.displayName,
          password: acc.password,
          birthdate: acc.registeredBirthdate,
          createdDate: acc.accountCreatedAt,
          isApprox: acc.createdDateApproximate,
          phone: acc.phoneNumber,
          pin: acc.pinCode,
          tfa: acc.twoFactorEnabled,
          tfaNote: TWO_FACTOR_LABELS[acc.twoFactorMethod],
          device: acc.primaryDevice,
          card: acc.linkedPaymentHint,
          subInfo: acc.subscriptionCost || (acc.renewalDate ? `يجدد ${acc.renewalDate}` : ''),
          status: STATUS_LABELS[acc.status],
          url: acc.websiteUrl,
          notes: acc.notes,
        });
      }

      for (const s of acc.registeredSites || []) {
        siteRows.push({
          name: s.name,
          method: SITE_SIGNUP_METHOD_LABELS[s.signupMethod],
          parentTitle: acc.title,
          parentEmail: acc.emailAddress || acc.username || '—',
          username: s.username,
          displayName: s.displayName,
          password:
            s.password ||
            (s.signupMethod === 'oauth_button' || s.signupMethod === 'email_same_pwd'
              ? acc.password
              : ''),
          birthdate: s.registeredBirthdate,
          createdDate: s.createdAtDate,
          isApprox: s.isApproximateDate,
          phone: s.phoneNumber,
          pin: s.pinCode,
          tfa: s.twoFactorEnabled,
          tfaNote: s.twoFactorNote,
          device: s.deviceUsed,
          card: s.linkedCardHint,
          subInfo: `${s.subscriptionCost || ''}${s.renewalDate ? ` (${s.renewalDate})` : ''}`.trim(),
          status: SITE_STATUS_LABELS[s.status],
          url: s.url,
          notes: s.notes,
        });
      }
    }

    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + Math.max(1, siteRows.length), column: headers.length },
    };

    siteRows.forEach((item, idx) => {
      const r = ws.getRow(5 + idx);
      const dur = calculateAccountDuration(item.createdDate);
      r.values = [
        idx + 1,
        item.name,
        item.method,
        item.parentTitle,
        item.parentEmail,
        item.username || '—',
        item.displayName || '—',
        formatSecret(item.password, includeSecrets, 'دخول بالحساب الأب'),
        formatReadableDate(item.birthdate),
        item.createdDate
          ? `${formatReadableDate(item.createdDate)}${item.isApprox ? ' (تقريبي)' : ''}`
          : 'غير مسجل',
        dur ? dur.label : '—',
        item.phone || '—',
        formatSecret(item.pin, includeSecrets),
        item.tfa ? item.tfaNote || 'مفعل' : 'غير مفعل',
        item.device || '—',
        item.card || '—',
        item.subInfo || '—',
        item.status,
        item.url || '—',
        item.notes || '—',
      ];
      styleDataRow(r, idx + 1);
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      [5, 6, 8, 9, 10, 12, 13].forEach((colIdx) => {
        r.getCell(colIdx).font = { name: 'Consolas', size: 10, color: { argb: PALETTE.obsidian } };
      });
      setHyperlinkIfValid(r.getCell(19), item.url);
      applyBadgeStyle(r.getCell(14), item.tfa ? 'emerald' : 'amber');
    });

    autoFitColumns(ws, 13, 35);
    ws.getColumn(1).width = 6;
  }

  // ============================================================================
  // SHEET 5: الاشتراكات والمدفوعات
  // ============================================================================
  if (sheets.subscriptions) {
    const ws = workbook.addWorksheet('الاشتراكات والمدفوعات', {
      properties: { tabColor: { argb: PALETTE.goldAccent } },
    });

    const headers = [
      '#',
      'الحساب / التطبيق',
      'التابع لـ',
      'نوع الاشتراك',
      'المبلغ',
      'العملة',
      'التجديد التلقائي',
      'تاريخ التجديد القادم',
      'حالة الموعد',
      'وسيلة الدفع المربوطة',
      'بريد الفواتير',
    ];

    applyRtlAndTitleBanner(
      ws,
      'متابعة الاشتراكات المالية ومواعيد التجديد والبطاقات المربوطة',
      subtitleText,
      headers.length,
      4
    );

    const headerRow = ws.getRow(4);
    headerRow.values = headers;
    styleHeaderRow(headerRow);

    interface SubExportRow {
      title: string;
      parent: string;
      cycle: string;
      amount: string | number;
      currency: string;
      autoRenew: string;
      renewalDate: string;
      daysLeft: number | null;
      paymentHint: string;
      billingEmail: string;
    }

    const subRows: SubExportRow[] = [];
    for (const acc of accounts) {
      const paid =
        acc.subscriptionStatus === 'monthly' ||
        acc.subscriptionStatus === 'yearly' ||
        acc.subscriptionStatus === 'lifetime' ||
        acc.subscriptionAmount > 0 ||
        Boolean(acc.subscriptionCost) ||
        Boolean(acc.renewalDate);
      if (paid) {
        subRows.push({
          title: acc.title,
          parent: 'حساب رئيسي',
          cycle: SUBSCRIPTION_LABELS[acc.subscriptionStatus],
          amount: acc.subscriptionAmount > 0 ? acc.subscriptionAmount : acc.subscriptionCost || '—',
          currency: CURRENCY_LABELS[acc.subscriptionCurrency || 'SAR'],
          autoRenew: acc.autoRenew ? 'تلقائي' : 'يدوي',
          renewalDate: acc.renewalDate,
          daysLeft: getDaysUntil(acc.renewalDate),
          paymentHint: acc.linkedPaymentHint || '—',
          billingEmail: acc.billingEmail || acc.emailAddress || '—',
        });
      }
      for (const site of acc.registeredSites || []) {
        if (site.subscriptionCost || site.renewalDate) {
          const parsedAmt = parseFloat(site.subscriptionCost.replace(/[^0-9.]/g, ''));
          subRows.push({
            title: site.name,
            parent: acc.title,
            cycle: 'اشتراك موقع مرتبط',
            amount: !Number.isNaN(parsedAmt) && parsedAmt > 0 ? parsedAmt : site.subscriptionCost || 'مفعل',
            currency: 'ريال سعودي',
            autoRenew: 'غير محدد',
            renewalDate: site.renewalDate,
            daysLeft: getDaysUntil(site.renewalDate),
            paymentHint: site.linkedCardHint || acc.linkedPaymentHint || '—',
            billingEmail: acc.billingEmail || acc.emailAddress || '—',
          });
        }
      }
    }

    subRows.forEach((item, idx) => {
      const r = ws.getRow(5 + idx);
      const dueLabel =
        item.daysLeft === null
          ? 'غير محدد'
          : item.daysLeft < 0
            ? `متأخر منذ ${Math.abs(item.daysLeft)} يوم`
            : item.daysLeft === 0
              ? 'اليوم'
              : `متبقي ${item.daysLeft} يوم`;

      r.values = [
        idx + 1,
        item.title,
        item.parent,
        item.cycle,
        item.amount,
        item.currency,
        item.autoRenew,
        formatReadableDate(item.renewalDate),
        dueLabel,
        item.paymentHint,
        item.billingEmail,
      ];
      styleDataRow(r, idx + 1);
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(5).font = { name: 'Consolas', size: 10.5, bold: true, color: { argb: PALETTE.obsidian } };
      if (typeof item.amount === 'number') {
        r.getCell(5).numFmt = '#,##0.00';
      }
      r.getCell(8).font = { name: 'Consolas', size: 10, color: { argb: PALETTE.obsidian } };

      if (item.daysLeft !== null) {
        applyBadgeStyle(
          r.getCell(9),
          item.daysLeft < 0 ? 'rose' : item.daysLeft <= 14 ? 'amber' : 'emerald'
        );
      }
    });

    if (subRows.length > 0) {
      const startR = 5;
      const endR = 4 + subRows.length;
      const summaryStart = endR + 2;
      const sumTitle = ws.getRow(summaryStart);
      ws.mergeCells(summaryStart, 1, summaryStart, 4);
      sumTitle.getCell(1).value = 'إجمالي المبالغ حسب العملة';
      sumTitle.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.white } };
      sumTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.royalIndigo } };
      sumTitle.getCell(1).alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
      sumTitle.height = 26;

      const uniqueCurrencies = Array.from(new Set(subRows.map((s) => s.currency).filter((c) => c !== '—')));
      uniqueCurrencies.forEach((currLabel, cIdx) => {
        const sr = ws.getRow(summaryStart + 1 + cIdx);
        sr.getCell(1).value = currLabel;
        sr.getCell(2).value = { formula: `SUMIF(F${startR}:F${endR},"${currLabel}",E${startR}:E${endR})` };
        sr.getCell(2).numFmt = '#,##0.00';
        sr.getCell(3).value = { formula: `COUNTIF(F${startR}:F${endR},"${currLabel}")` };
        sr.getCell(4).value = 'اشتراك';
        styleDataRow(sr, cIdx + 1);
        sr.getCell(2).font = { name: 'Consolas', size: 11, bold: true, color: { argb: PALETTE.indigoDeep } };
      });
    }

    autoFitColumns(ws, 14, 34);
    ws.getColumn(1).width = 6;
  }

  // ============================================================================
  // SHEET 6: سجل كلمات المرور والأحداث والحقول المخصصة
  // ============================================================================
  if (sheets.historyAndFields) {
    const ws = workbook.addWorksheet('الأسرار والأحداث', {
      properties: { tabColor: { argb: 'FF7C3AED' } },
    });

    const headers = [
      '#',
      'نوع السجل',
      'الحساب / المنصة',
      'البريد الإلكتروني',
      'العنوان / الحقل / التاريخ',
      'القيمة / كلمة المرور السابقة / الحدث',
      'ملاحظات إضافية',
    ];

    applyRtlAndTitleBanner(
      ws,
      'الأرشيف التفصيلي — سجل كلمات المرور السابقة، الحقول المخصصة، ومحطات الحسابات',
      subtitleText,
      headers.length,
      4
    );

    const headerRow = ws.getRow(4);
    headerRow.values = headers;
    styleHeaderRow(headerRow);

    interface ArchiveRow {
      type: 'تدوير كلمة مرور' | 'حقل مخصص' | 'محطة زمنية';
      accountTitle: string;
      email: string;
      keyLabel: string;
      val: string;
      note: string;
    }

    const archiveRows: ArchiveRow[] = [];
    for (const acc of accounts) {
      for (const ph of acc.passwordHistory || []) {
        archiveRows.push({
          type: 'تدوير كلمة مرور',
          accountTitle: acc.title,
          email: acc.emailAddress || acc.username || '—',
          keyLabel: `بتاريخ ${formatReadableDate(ph.changedAt)}`,
          val: formatSecret(ph.password, includeSecrets),
          note: ph.note || 'كلمة مرور سابقة مؤرشفة',
        });
      }
      for (const cf of acc.customFields || []) {
        archiveRows.push({
          type: 'حقل مخصص',
          accountTitle: acc.title,
          email: acc.emailAddress || acc.username || '—',
          keyLabel: cf.label,
          val: cf.isSecret ? formatSecret(cf.value, includeSecrets) : cf.value || '—',
          note: cf.isSecret ? 'حقل سري' : 'حقل عادي',
        });
      }
      for (const ev of acc.timelineEvents || []) {
        archiveRows.push({
          type: 'محطة زمنية',
          accountTitle: acc.title,
          email: acc.emailAddress || acc.username || '—',
          keyLabel: formatReadableDate(ev.date),
          val: ev.title,
          note: 'حدث موثّق في سجل الحساب',
        });
      }
    }

    archiveRows.forEach((item, idx) => {
      const r = ws.getRow(5 + idx);
      r.values = [
        idx + 1,
        item.type,
        item.accountTitle,
        item.email,
        item.keyLabel,
        item.val,
        item.note,
      ];
      styleDataRow(r, idx + 1);
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      [4, 5, 6].forEach((colIdx) => {
        r.getCell(colIdx).font = { name: 'Consolas', size: 10, color: { argb: PALETTE.obsidian } };
      });
      applyBadgeStyle(
        r.getCell(2),
        item.type === 'تدوير كلمة مرور' ? 'amber' : item.type === 'حقل مخصص' ? 'indigo' : 'emerald'
      );
    });

    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + Math.max(1, archiveRows.length), column: headers.length },
    };

    autoFitColumns(ws, 16, 40);
    ws.getColumn(1).width = 6;
  }

  // ============================================================================
  // SHEET 7: الاسترداد والطوارئ
  // ============================================================================
  if (sheets.recovery) {
    const ws = workbook.addWorksheet('الاسترداد والطوارئ', {
      properties: { tabColor: { argb: 'FFE11D48' } },
    });

    const headers = [
      '#',
      'الحساب / المنصة',
      'البريد / المستخدم',
      'بريد الاسترداد',
      'جوال الاسترداد',
      'جهة اتصال الطوارئ',
      'الأجهزة الموثوقة',
      'رموز الاسترداد الاحتياطية',
      'أسئلة الأمان وإجاباتها',
      'خطة الطوارئ عند فقدان الحساب',
    ];

    applyRtlAndTitleBanner(
      ws,
      'ملف الطوارئ والاسترداد الموثّق للحسابات',
      subtitleText,
      headers.length,
      4
    );

    const headerRow = ws.getRow(4);
    headerRow.values = headers;
    styleHeaderRow(headerRow);

    accounts.forEach((acc, idx) => {
      const r = ws.getRow(5 + idx);
      const secQText =
        (acc.securityQuestions || []).length > 0
          ? acc.securityQuestions
              .map((q) => (includeSecrets ? `${q.question}: ${q.answer}` : `${q.question}: ••••`))
              .join('\n')
          : '—';
      const backupText = !acc.backupCodes
        ? '—'
        : includeSecrets
          ? acc.backupCodes.replace(/\n/g, ' , ')
          : 'محفوظة (مخفية في هذا التصدير)';

      r.values = [
        idx + 1,
        acc.title,
        acc.emailAddress || acc.username || '—',
        acc.recoveryEmail || '—',
        acc.recoveryPhone || '—',
        acc.recoveryContactPerson || '—',
        [acc.primaryDevice, ...(acc.trustedDevices || [])].filter(Boolean).join(' · ') || '—',
        backupText,
        secQText,
        acc.emergencyInstructions || '—',
      ];
      styleDataRow(r, idx + 1);
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      [3, 4, 5, 8].forEach((colIdx) => {
        r.getCell(colIdx).font = { name: 'Consolas', size: 10, color: { argb: PALETTE.obsidian } };
      });
    });

    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + Math.max(1, accounts.length), column: headers.length },
    };

    autoFitColumns(ws, 16, 42);
    ws.getColumn(1).width = 6;
  }

  // Generate .xlsx binary and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeSuffix = customFileSuffix ? `-${customFileSuffix}` : '';
  link.download = `Khaznati-Vault${safeSuffix}-${todayStr}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
