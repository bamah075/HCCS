'use client';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useSettingsContext } from 'src/components/settings';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControlLabel,
    MenuItem,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import { useEffect, useState } from 'react';
import { generateCompliancePdf } from './generate-compliance-pdf';
import {
    get_compliance_scans_details,
    save_compliance_scan_action_report,
} from 'src/components/api/api';
import {
    COMPLIANCE_SCAN_SELECTIONS,
    REMARK_PRESETS,
} from './compliance-scan-selections';
import ComplianceDocumentsPanel from './ComplianceDocumentsPanel';

export default function ComplianceScanDetailView({ id }) {
    const settings = useSettingsContext();

    const [scanData, setScanData] = useState(null);
    const [summary, setSummary] = useState({});
    const [answers, setAnswers] = useState([]);
    const [actionReports, setActionReports] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [actionChoiceMap, setActionChoiceMap] = useState({});
    const [actionOtherMap, setActionOtherMap] = useState({});
    const [remarksChoice, setRemarksChoice] = useState('');
    const [remarksOther, setRemarksOther] = useState('');
    const [submittedAt, setSubmittedAt] = useState('-');
    const [saving, setSaving] = useState(false);
    const [alertState, setAlertState] = useState(null);
    const [expandedReportId, setExpandedReportId] = useState(null);
    const [withCustomerDetails, setWithCustomerDetails] = useState(true);
    const [downloading, setDownloading] = useState(false);

    const handleDownloadPdf = async () => {
        if (!scanData) return;
        setDownloading(true);
        try {
            await generateCompliancePdf(scanData, summary, answers, actionReports, { withCustomerDetails });
        } finally {
            setDownloading(false);
        }
    };

    const getData = async () => {
        const res = await get_compliance_scans_details({ id });
        if (!res.status || !res.data) {
            setAlertState({ severity: 'error', message: res.message || 'Failed to load compliance scan details.' });
            return;
        }

        const payload = res.data;
        const scan = payload.scan || null;
        const answerRows = Array.isArray(payload.answers) ? payload.answers : [];

        setScanData(scan);
        setSummary(payload.summary || {});
        setAnswers(answerRows);
        setActionReports(Array.isArray(payload.action_reports) ? payload.action_reports : []);
        setDocuments(Array.isArray(payload.documents) ? payload.documents : []);
        setSubmittedAt(scan?.created_at ? new Date(scan.created_at).toLocaleString() : '-');
        setActionChoiceMap({});
        setActionOtherMap({});
        setRemarksChoice('');
        setRemarksOther('');
        setExpandedReportId(null);
        setAlertState(null);
    };

    useEffect(() => {
        getData();
    }, [id]);

    const handleSaveActionReport = async () => {
        if (!scanData?.id) return;

        const finalRemarks = remarksChoice === 'Other' ? remarksOther.trim() : remarksChoice;

        const actionsPayload = answers
            .filter((row) => row.question_id)
            .map((row) => ({
                compliance_question_id: row.question_id,
                action_taken:
                    actionChoiceMap[row.question_id] === 'Other'
                        ? String(actionOtherMap[row.question_id] || '').trim()
                        : String(actionChoiceMap[row.question_id] || '').trim(),
            }));

        setSaving(true);
        const res = await save_compliance_scan_action_report({
            scan_id: scanData.id,
            actions: JSON.stringify(actionsPayload),
            remarks: finalRemarks,
        });
        setSaving(false);

        if (!res.status) {
            setAlertState({ severity: 'error', message: res.message || 'Failed to save action report.' });
            return;
        }

        setActionChoiceMap({});
        setActionOtherMap({});
        setRemarksChoice('');
        setRemarksOther('');
        setAlertState({ severity: 'success', message: 'Action report created successfully.' });
        await getData();
    };

    const riskColor =
        summary.riskLevel === 'HIGH' ? 'error' : summary.riskLevel === 'MEDIUM' ? 'warning' : 'success';

    const formatCreatedAt = (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleString();
    };

    const normalizeArray = (value) => {
        if (Array.isArray(value)) return value;
        if (!value) return [];
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed;
            } catch {
                return [value];
            }
        }
        return [];
    };

    const alerts = normalizeArray(summary.alerts ?? summary.alert);
    const recommendations = normalizeArray(summary.recommendations ?? summary.recommendation);
    const questionMap = answers.reduce((acc, row) => {
        if (row.question_id) {
            acc[row.question_id] = row.question || '-';
        }
        return acc;
    }, {});
    const selectedAnswerMap = answers.reduce((acc, row) => {
        if (row.question_id) {
            acc[row.question_id] = row.selected || '-';
        }
        return acc;
    }, {});
    const questionNumberMap = answers.reduce((acc, row, idx) => {
        if (row.question_id) {
            acc[row.question_id] = row.question_number ?? idx + 1;
        }
        return acc;
    }, {});

    return (
        <Container maxWidth={settings.themeStretch ? false : 'lg'}>
            {scanData && (
                <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={withCustomerDetails}
                                onChange={(e) => setWithCustomerDetails(e.target.checked)}
                            />
                        }
                        label="Include customer details in PDF"
                    />
                    <LoadingButton
                        loading={downloading}
                        variant="contained"
                        onClick={handleDownloadPdf}
                    >
                        Download Report PDF
                    </LoadingButton>
                </Stack>
            )}
            {scanData && (
                <>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', lg: '1.1fr 1fr' },
                        gap: 3,
                        alignItems: 'start',
                    }}
                >
                    <Card>
                        <CardContent>
                            {alertState && (
                                <Alert severity={alertState.severity} sx={{ mb: 2 }}>
                                    {alertState.message}
                                </Alert>
                            )}

                            <Typography variant="h6" sx={{ mb: 1 }}>
                                Submission Info
                            </Typography>
                            <Table size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell width={220}>Company</TableCell>
                                        <TableCell>{scanData.company_name || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Contact Name</TableCell>
                                        <TableCell>{scanData.contact_name || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Business Email</TableCell>
                                        <TableCell>{scanData.business_email || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Contact Number</TableCell>
                                        <TableCell>{scanData.contact_number || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Industry</TableCell>
                                        <TableCell>{scanData.industry || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Employees</TableCell>
                                        <TableCell>{scanData.employess || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Has Foreign Workers</TableCell>
                                        <TableCell>{scanData.has_foreign_workers ? 'Yes' : 'No'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Submitted At</TableCell>
                                        <TableCell>{submittedAt}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="h6" sx={{ mb: 1 }}>
                                Assessment Summary
                            </Typography>
                            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
                                <Chip label={`Total Score: ${summary.totalScore ?? '-'}`} color="primary" variant="outlined" />
                                <Chip label={`Risk Level: ${summary.riskLevel ?? '-'}`} color={riskColor} variant="outlined" />
                                <Chip label={`Primary Risk: ${summary.primaryRisk ?? '-'}`} variant="outlined" />
                            </Stack>

                            {alerts.map((item, index) => (
                                <Alert key={`alert-${index}`} severity="warning" sx={{ mb: 1 }}>
                                    {item}
                                </Alert>
                            ))}

                            {recommendations.map((item, index) => (
                                <Alert key={`rec-${index}`} severity="info" sx={{ mb: 1 }}>
                                    {item}
                                </Alert>
                            ))}

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="h6" sx={{ mb: 1 }}>
                                Question-by-Question Report
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell width={70}>#</TableCell>
                                        <TableCell>Question</TableCell>
                                        <TableCell width={260}>Selected Answer</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {answers.map((row, idx) => (
                                        <TableRow key={`${row.question_id ?? idx}-${idx}`}>
                                            <TableCell>{row.question_number ?? idx + 1}</TableCell>
                                            <TableCell>{row.question || '-'}</TableCell>
                                            <TableCell>{row.selected || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                    {answers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3}>
                                                <Typography variant="body2" color="text.secondary">
                                                    No answer details found in this report.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Stack gap={2}>
                                <Typography variant="h6">Action Reports</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Each save creates a new report snapshot for this compliance scan.
                                </Typography>

                                <TextField
                                    select
                                    label="Overall Remarks"
                                    value={remarksChoice}
                                    onChange={(event) => setRemarksChoice(event.target.value)}
                                >
                                    <MenuItem value="">Select a remarks template</MenuItem>
                                    {REMARK_PRESETS.map((item) => (
                                        <MenuItem key={item} value={item}>
                                            {item}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                {remarksChoice === 'Other' && (
                                    <TextField
                                        label="Custom Remarks"
                                        multiline
                                        minRows={2}
                                        value={remarksOther}
                                        onChange={(event) => setRemarksOther(event.target.value)}
                                        placeholder="Write custom remarks..."
                                    />
                                )}

                                {answers.map((row, idx) => (
                                    <Stack key={`action-${row.question_id ?? idx}`} gap={1}>
                                        <Typography variant="subtitle2">
                                            {`${row.question_number ?? idx + 1}. ${row.question || '-'}`}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {`Initial answer: ${row.selected || '-'}`}
                                        </Typography>
                                        <TextField
                                            select
                                            label="Action Taken"
                                            value={actionChoiceMap[row.question_id] || ''}
                                            onChange={(event) => {
                                                setActionChoiceMap((prev) => ({
                                                    ...prev,
                                                    [row.question_id]: event.target.value,
                                                }));
                                            }}
                                            disabled={!row.question_id}
                                        >
                                            <MenuItem value="">Select an action</MenuItem>
                                            {(
                                                COMPLIANCE_SCAN_SELECTIONS.question_actions[
                                                String(row.question_number ?? idx + 1)
                                                ] || []
                                            ).map((item) => (
                                                <MenuItem key={item} value={item}>
                                                    {item}
                                                </MenuItem>
                                            ))}
                                            <MenuItem value="Other">Other</MenuItem>
                                        </TextField>

                                        {actionChoiceMap[row.question_id] === 'Other' && (
                                            <TextField
                                                multiline
                                                minRows={2}
                                                value={actionOtherMap[row.question_id] || ''}
                                                onChange={(event) => {
                                                    setActionOtherMap((prev) => ({
                                                        ...prev,
                                                        [row.question_id]: event.target.value,
                                                    }));
                                                }}
                                                placeholder="Write custom action taken..."
                                                disabled={!row.question_id}
                                            />
                                        )}
                                    </Stack>
                                ))}

                                <LoadingButton
                                    loading={saving}
                                    variant="contained"
                                    sx={{ alignSelf: 'flex-start' }}
                                    onClick={handleSaveActionReport}
                                    disabled={!answers.length}
                                >
                                    Create Action Report
                                </LoadingButton>

                                <Divider />

                                <Typography variant="subtitle1">Previous Action Reports</Typography>
                                {actionReports.length === 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                        No action reports have been created yet.
                                    </Typography>
                                )}

                                {actionReports.map((report) => {
                                    const isExpanded = expandedReportId === report.id;
                                    return (
                                        <Stack
                                            key={report.id}
                                            gap={1}
                                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}
                                        >
                                            <Typography variant="subtitle2">{`Report #${report.id}`}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {`Created: ${formatCreatedAt(report.created_at)}`}
                                            </Typography>
                                            <Typography variant="body2">
                                                {report.remarks || 'No remarks provided.'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {`Actions logged: ${Array.isArray(report.actions) ? report.actions.length : 0}`}
                                            </Typography>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                sx={{ alignSelf: 'flex-start' }}
                                                onClick={() => {
                                                    setExpandedReportId((prev) => (prev === report.id ? null : report.id));
                                                }}
                                            >
                                                {isExpanded ? 'Hide Details' : 'View Details'}
                                            </Button>

                                            {isExpanded && (
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell width={70}>#</TableCell>
                                                            <TableCell>Question</TableCell>
                                                            <TableCell>Initial Answer</TableCell>
                                                            <TableCell>Action Taken</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {(report.actions || []).map((action, actionIdx) => (
                                                            <TableRow key={`${report.id}-${action.id ?? actionIdx}`}>
                                                                <TableCell>{questionNumberMap[action.compliance_question_id] ?? actionIdx + 1}</TableCell>
                                                                <TableCell>{questionMap[action.compliance_question_id] || '-'}</TableCell>
                                                                <TableCell>{selectedAnswerMap[action.compliance_question_id] || '-'}</TableCell>
                                                                <TableCell>{action.action_taken || '-'}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {(report.actions || []).length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={4}>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        No action lines were saved for this report.
                                                                    </Typography>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        </CardContent>
                    </Card>
                </Box>
                <Box sx={{ mt: 3 }}>
                    <ComplianceDocumentsPanel scanId={scanData.id} documents={documents} onUploaded={getData} />
                </Box>
                </>
            )}
        </Container>
    );
}

