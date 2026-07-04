/**
 * Generates and downloads a Compliance Scan Report PDF.
 *
 * @param {object} scanData    - Raw scan row from the DB
 * @param {object} summary     - { totalScore, riskLevel, primaryRisk, alerts[], recommendations[] }
 * @param {Array}  answers     - [{ question_number, question, selected }]
 * @param {Array}  actionReports - Each report has { id, created_at, remarks, actions[] }
 * @param {object} options
 * @param {boolean} options.withCustomerDetails - Whether to include customer PII
 */
export async function generateCompliancePdf(
    scanData,
    summary,
    answers,
    actionReports,
    { withCustomerDetails = true } = {}
) {
    // Dynamic import so Next.js doesn't try to SSR these browser-only libs
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Register a CJK-capable font (SimHei) for Chinese text, but keep Helvetica
    // as the default for Latin so English text doesn't get SimHei's wide /
    // monospaced Latin glyphs. We pick per-call / per-cell which font to use
    // based on whether the text contains CJK characters.
    let CJK_FONT = 'helvetica'; // fallback if SimHei fetch fails
    try {
        const SIMHEI_URL =
            (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '') +
            '/storage/v1/object/public/images/fonts/SimHei.ttf';
        if (!window.__simheiB64) {
            const r = await fetch(SIMHEI_URL);
            if (r.ok) {
                const buf = await r.arrayBuffer();
                let bin = '';
                const bytes = new Uint8Array(buf);
                for (let i = 0; i < bytes.byteLength; i += 1) bin += String.fromCharCode(bytes[i]);
                window.__simheiB64 = btoa(bin);
            }
        }
        if (window.__simheiB64) {
            doc.addFileToVFS('SimHei.ttf', window.__simheiB64);
            doc.addFont('SimHei.ttf', 'SimHei', 'normal');
            doc.addFont('SimHei.ttf', 'SimHei', 'bold');
            doc.addFont('SimHei.ttf', 'SimHei', 'italic');
            CJK_FONT = 'SimHei';
        }
    } catch (e) {
        console.warn('[compliance-pdf] CJK font load failed:', e?.message);
    }

    const CJK_RE = /[　-鿿＀-￯]/;
    const hasCjk = (text) => typeof text === 'string' && CJK_RE.test(text);
    const pickFont = (text) => (hasCjk(text) ? CJK_FONT : 'helvetica');
    const setFontFor = (text, style) => doc.setFont(pickFont(text), style);
    // autotable hook: pick font per cell based on its raw content. Headers
    // always English → Helvetica.
    const cjkPerCell = (data) => {
        if (data.section === 'head') {
            data.cell.styles.font = 'helvetica';
            return;
        }
        const raw = data.cell.raw;
        const text = typeof raw === 'string' ? raw : (data.cell.text || []).join(' ');
        data.cell.styles.font = hasCjk(text) ? CJK_FONT : 'helvetica';
    };

    // ── Colour palette ──────────────────────────────────────────────────────
    const PRIMARY = [25, 118, 210];   // MUI blue
    const DARK = [33, 33, 33];
    const GREY = [97, 97, 97];
    const LIGHT = [245, 245, 245];
    const WARNING = [237, 108, 2];
    const INFO = [2, 136, 209];

    // ── Helpers ─────────────────────────────────────────────────────────────
    const fmt = (v) => (v == null || v === '' ? '-' : String(v));
    const fmtDate = (v) => {
        if (!v) return '-';
        try { return new Date(v).toLocaleString(); } catch { return String(v); }
    };
    const normalizeArr = (v) => {
        if (Array.isArray(v)) return v;
        if (!v) return [];
        try { const p = JSON.parse(v); return Array.isArray(p) ? p : [String(v)]; } catch { return [String(v)]; }
    };

    let y = 15; // current Y cursor

    const addPageIfNeeded = (requiredHeight = 20) => {
        if (y + requiredHeight > doc.internal.pageSize.getHeight() - 15) {
            doc.addPage();
            y = 15;
        }
    };

    const drawSectionHeader = (text) => {
        addPageIfNeeded(14);
        doc.setFillColor(...PRIMARY);
        doc.roundedRect(14, y, pageWidth - 28, 8, 1.5, 1.5, 'F');
        doc.setFontSize(10);
        // Section headers are always English → Helvetica.
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(text.toUpperCase(), 18, y + 5.5);
        doc.setTextColor(...DARK);
        y += 12;
    };

    // ── Cover header ────────────────────────────────────────────────────────
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('HR Compliance Scan Report', 14, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);
    doc.text(
        withCustomerDetails ? 'Includes customer details' : 'Customer details hidden',
        pageWidth - 14,
        20,
        { align: 'right' }
    );

    doc.setTextColor(...DARK);
    y = 38;

    // ── 1. Customer Details ──────────────────────────────────────────────────
    if (withCustomerDetails) {
        drawSectionHeader('Customer Details');
        autoTable(doc, {
            startY: y,
            margin: { left: 14, right: 14 },
            styles: { fontSize: 9, cellPadding: 2.5, textColor: DARK },
            alternateRowStyles: { fillColor: LIGHT },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, fillColor: [235, 245, 255] } },
            didParseCell: cjkPerCell,
            body: [
                ['Company', fmt(scanData.company_name)],
                ['Contact Name', fmt(scanData.contact_name)],
                ['Business Email', fmt(scanData.business_email)],
                ['Contact Number', fmt(scanData.contact_number)],
                ['Industry', fmt(scanData.industry)],
                ['Employees', fmt(scanData.employess ?? scanData.employees)],
                ['Has Foreign Workers', scanData.has_foreign_workers ? 'Yes' : 'No'],
                ['Submitted At', fmtDate(scanData.created_at)],
            ],
            theme: 'plain',
        });
        y = doc.lastAutoTable.finalY + 8;
    }

    // ── 2. Assessment Summary ────────────────────────────────────────────────
    drawSectionHeader('Assessment Summary');

    const alerts = normalizeArr(summary.alerts ?? summary.alert);
    const recommendations = normalizeArr(summary.recommendations ?? summary.recommendation);

    // Total Score chip relative to scan max (= #answers × 2 since every
    // question scores 0–2). Keeps the chip readable regardless of which
    // scan variant ran (original 10 → max 20, WFA 20 → max 40, merged
    // v1 30 → max 60).
    const maxScore = Array.isArray(answers) && answers.length > 0
        ? answers.length * 2
        : null;
    const totalScoreLabel = summary.totalScore != null && maxScore != null
        ? `Total Score: ${summary.totalScore} / ${maxScore}`
        : `Total Score: ${fmt(summary.totalScore)}`;

    // Score / risk chips row
    const chips = [
        { label: totalScoreLabel, color: PRIMARY },
        { label: `Risk Level: ${fmt(summary.riskLevel)}`, color: summary.riskLevel === 'HIGH' ? [211, 47, 47] : summary.riskLevel === 'MEDIUM' ? WARNING : [46, 125, 50] },
        { label: `Primary Risk: ${fmt(summary.primaryRisk)}`, color: GREY },
    ];

    let cx = 14;
    chips.forEach(({ label, color }) => {
        // Primary Risk chip can hold CJK; pick font per-chip.
        setFontFor(label, 'bold');
        doc.setFontSize(8.5);
        const w = doc.getTextWidth(label) + 8;
        doc.setFillColor(...color);
        doc.roundedRect(cx, y, w, 7, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(label, cx + 4, y + 4.8);
        cx += w + 4;
    });
    doc.setTextColor(...DARK);
    y += 12;

    // Alerts
    if (alerts.length) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...WARNING);
        doc.text('Alerts', 14, y);
        y += 5;
        doc.setTextColor(...DARK);
        alerts.forEach((item) => {
            addPageIfNeeded(7);
            doc.setFillColor(255, 243, 224);
            doc.roundedRect(14, y, pageWidth - 28, 6, 1, 1, 'F');
            doc.setTextColor(...WARNING);
            doc.setFont('helvetica', 'bold');
            doc.text('!', 18, y + 4.2);
            doc.setTextColor(...DARK);
            setFontFor(item, 'normal');
            const wrapped = doc.splitTextToSize(fmt(item), pageWidth - 48);
            doc.text(wrapped, 24, y + 4.2);
            y += 6 * wrapped.length + 2;
        });
        y += 2;
    }

    // Recommendations
    if (recommendations.length) {
        addPageIfNeeded(10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...INFO);
        doc.text('Recommendations', 14, y);
        y += 5;
        doc.setTextColor(...DARK);
        recommendations.forEach((item) => {
            addPageIfNeeded(7);
            doc.setFillColor(225, 245, 254);
            doc.roundedRect(14, y, pageWidth - 28, 6, 1, 1, 'F');
            doc.setTextColor(...INFO);
            doc.setFont('helvetica', 'bold');
            doc.text('i', 18.5, y + 4.2);
            doc.setTextColor(...DARK);
            setFontFor(item, 'normal');
            const wrapped = doc.splitTextToSize(fmt(item), pageWidth - 48);
            doc.text(wrapped, 24, y + 4.2);
            y += 6 * wrapped.length + 2;
        });
        y += 2;
    }

    // ── 3. Question-by-Question Answers ─────────────────────────────────────
    addPageIfNeeded(20);
    drawSectionHeader('Question-by-Question Answers');

    autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8.5, cellPadding: 2.5, textColor: DARK },
        headStyles: { font: 'helvetica', fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: LIGHT },
        columnStyles: { 0: { cellWidth: 12 }, 2: { cellWidth: 68 } },
        didParseCell: cjkPerCell,
        head: [['#', 'Question', 'Selected Answer']],
        body: answers.map((row, idx) => [
            fmt(row.question_number ?? idx + 1),
            fmt(row.question),
            fmt(row.selected),
        ]),
        theme: 'striped',
    });
    y = doc.lastAutoTable.finalY + 8;

    // ── 4. Action Reports ────────────────────────────────────────────────────
    if (actionReports.length) {
        addPageIfNeeded(20);
        drawSectionHeader('Action Reports');

        // Build question lookup maps from answers
        const questionMap = {};
        const selectedAnswerMap = {};
        const questionNumberMap = {};
        answers.forEach((row, idx) => {
            if (row.question_id) {
                questionMap[row.question_id] = row.question || '-';
                selectedAnswerMap[row.question_id] = row.selected || '-';
                questionNumberMap[row.question_id] = row.question_number ?? idx + 1;
            }
        });

        actionReports.forEach((report, rIdx) => {
            addPageIfNeeded(24);

            // Report header bar
            doc.setFillColor(240, 244, 255);
            doc.roundedRect(14, y, pageWidth - 28, 14, 1.5, 1.5, 'F');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...PRIMARY);
            doc.text(`Report #${report.id}   (${fmtDate(report.created_at)})`, 18, y + 5.5);
            const remarksLabel = `Remarks: ${fmt(report.remarks)}`;
            setFontFor(remarksLabel, 'normal');
            doc.setTextColor(...DARK);
            const remarksText = doc.splitTextToSize(remarksLabel, pageWidth - 42);
            doc.text(remarksText, 18, y + 11);
            y += 14 + remarksText.length * 4.5 + 2;

            const actions = Array.isArray(report.actions) ? report.actions : [];
            if (actions.length) {
                autoTable(doc, {
                    startY: y,
                    margin: { left: 14, right: 14 },
                    styles: { fontSize: 8, cellPadding: 2.2, textColor: DARK },
                    headStyles: { font: 'helvetica', fillColor: [66, 66, 66], textColor: [255, 255, 255], fontStyle: 'bold' },
                    didParseCell: cjkPerCell,
                    alternateRowStyles: { fillColor: LIGHT },
                    columnStyles: { 0: { cellWidth: 12 } },
                    head: [['#', 'Question', 'Initial Answer', 'Action Taken']],
                    body: actions.map((action, aIdx) => [
                        fmt(questionNumberMap[action.compliance_question_id] ?? aIdx + 1),
                        fmt(questionMap[action.compliance_question_id]),
                        fmt(selectedAnswerMap[action.compliance_question_id]),
                        fmt(action.action_taken),
                    ]),
                    theme: 'striped',
                });
                y = doc.lastAutoTable.finalY + 6;
            } else {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(...GREY);
                doc.text('No action lines recorded for this report.', 18, y + 4);
                y += 10;
            }

            if (rIdx < actionReports.length - 1) {
                doc.setDrawColor(200, 200, 200);
                doc.line(14, y, pageWidth - 14, y);
                y += 5;
            }
        });
    }

    // ── Footer on every page ─────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GREY);
        doc.text('HCCS — Confidential', 14, doc.internal.pageSize.getHeight() - 8);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }

    // ── Save ─────────────────────────────────────────────────────────────────
    const safeName = (scanData.company_name || 'compliance').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`compliance_report_${safeName}_${Date.now()}.pdf`);
}

/**
 * Generates and downloads a Compliance Scan CSV showing issues and actions taken.
 *
 * @param {object} scanData
 * @param {object} summary    - { totalScore, riskLevel, primaryRisk, alerts[], recommendations[] }
 * @param {Array}  answers    - [{ question_number, question, selected }]
 * @param {Array}  actionReports
 * @param {object} options
 * @param {boolean} options.withCustomerDetails
 */
export function generateComplianceCsv(
    scanData,
    summary,
    answers,
    actionReports,
    { withCustomerDetails = true } = {}
) {
    const esc = (v) => {
        const s = String(v ?? '');
        if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
    };
    const fmtDate = (v) => { try { return v ? new Date(v).toLocaleString() : '-'; } catch { return String(v); } };
    const normalizeArr = (v) => {
        if (Array.isArray(v)) return v;
        if (!v) return [];
        try { const p = JSON.parse(v); return Array.isArray(p) ? p : [String(v)]; } catch { return [String(v)]; }
    };

    const lines = ['\uFEFF']; // BOM for Excel UTF-8

    // ── Section 1: Customer info ─────────────────────────────────────────────
    if (withCustomerDetails) {
        lines.push('CUSTOMER DETAILS');
        lines.push(['Company', esc(scanData.company_name)].join(','));
        lines.push(['Contact Name', esc(scanData.contact_name)].join(','));
        lines.push(['Business Email', esc(scanData.business_email)].join(','));
        lines.push(['Contact Number', esc(scanData.contact_number)].join(','));
        lines.push(['Industry', esc(scanData.industry)].join(','));
        lines.push(['Employees', esc(scanData.employess ?? scanData.employees)].join(','));
        lines.push(['Has Foreign Workers', scanData.has_foreign_workers ? 'Yes' : 'No'].join(','));
        lines.push(['Submitted At', esc(fmtDate(scanData.created_at))].join(','));
        lines.push('');
    }

    // ── Section 2: Assessment summary ────────────────────────────────────────
    lines.push('ASSESSMENT SUMMARY');
    lines.push(['Total Score', esc(summary.totalScore ?? '-')].join(','));
    lines.push(['Risk Level', esc(summary.riskLevel ?? '-')].join(','));
    lines.push(['Primary Risk', esc(summary.primaryRisk ?? '-')].join(','));
    lines.push('');

    const alerts = normalizeArr(summary.alerts ?? summary.alert);
    const recommendations = normalizeArr(summary.recommendations ?? summary.recommendation);

    if (alerts.length) {
        lines.push('ALERTS');
        alerts.forEach((a, i) => lines.push([i + 1, esc(a)].join(',')));
        lines.push('');
    }

    if (recommendations.length) {
        lines.push('RECOMMENDATIONS');
        recommendations.forEach((r, i) => lines.push([i + 1, esc(r)].join(',')));
        lines.push('');
    }

    // ── Section 3: Q&A ───────────────────────────────────────────────────────
    lines.push('QUESTION-BY-QUESTION ANSWERS');
    lines.push(['#', 'Question', 'Selected Answer'].join(','));
    answers.forEach((row, idx) => {
        lines.push([
            esc(row.question_number ?? idx + 1),
            esc(row.question),
            esc(row.selected),
        ].join(','));
    });
    lines.push('');

    // ── Section 4: Action Reports ─────────────────────────────────────────────
    if (actionReports.length) {
        // Build lookup maps
        const questionMap = {};
        const selectedAnswerMap = {};
        const questionNumberMap = {};
        answers.forEach((row, idx) => {
            if (row.question_id) {
                questionMap[row.question_id] = row.question || '-';
                selectedAnswerMap[row.question_id] = row.selected || '-';
                questionNumberMap[row.question_id] = row.question_number ?? idx + 1;
            }
        });

        lines.push('ACTION REPORTS');
        actionReports.forEach((report) => {
            lines.push('');
            lines.push([`Report #${report.id}`, esc(fmtDate(report.created_at))].join(','));
            lines.push(['Remarks', esc(report.remarks || '-')].join(','));
            lines.push(['#', 'Question', 'Issue (Initial Answer)', 'Action Taken'].join(','));
            const actions = Array.isArray(report.actions) ? report.actions : [];
            actions.forEach((action, aIdx) => {
                lines.push([
                    esc(questionNumberMap[action.compliance_question_id] ?? aIdx + 1),
                    esc(questionMap[action.compliance_question_id]),
                    esc(selectedAnswerMap[action.compliance_question_id]),
                    esc(action.action_taken),
                ].join(','));
            });
            if (!actions.length) lines.push('(No actions recorded)');
        });
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (scanData.company_name || 'compliance').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `compliance_issues_actions_${safeName}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
