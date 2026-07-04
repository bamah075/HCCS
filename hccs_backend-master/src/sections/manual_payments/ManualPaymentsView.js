'use client';

import { useEffect, useState, useCallback } from 'react';
import Container from '@mui/material/Container';
import {
    Alert, Box, Button, Card, CardContent, CardHeader, Chip, CircularProgress, Dialog,
    DialogActions, DialogContent, DialogTitle, IconButton, Stack, Table, TableBody, TableCell,
    TableHead, TableRow, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';

import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';

function fmtSgd(n) {
    const v = Number(n) || 0;
    return `S$${v.toLocaleString('en-SG')}`;
}
function fmtDate(s) {
    if (!s) return '-';
    try { return new Date(s).toLocaleString('en-SG'); } catch { return String(s); }
}

const STATUS_FILTERS = [
    { key: 'pending',  label: 'Pending review' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all',      label: 'All' },
];

export default function ManualPaymentsView() {
    const settings = useSettingsContext();
    const [tab, setTab] = useState('pending');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState(null); // { row, action: 'approve' | 'reject' }
    const [reviewerNote, setReviewerNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/manual_payments?status=${tab}`, { cache: 'no-store' });
            const data = await res.json();
            setRows(data.status ? (data.data || []) : []);
            if (!data.status) setToast({ kind: 'error', text: data.message || 'Could not load.' });
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => { load(); }, [load]);

    const openDialog = (row, action) => {
        setDialog({ row, action });
        setReviewerNote('');
    };
    const closeDialog = () => { setDialog(null); setReviewerNote(''); };

    const submitDecision = async () => {
        if (!dialog) return;
        setSubmitting(true);
        try {
            const endpoint = dialog.action === 'approve'
                ? '/api/manual_payments/approve'
                : '/api/manual_payments/reject';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: dialog.row.id, reviewerNote }),
            });
            const data = await res.json();
            if (data.status) {
                setToast({
                    kind: 'success',
                    text: dialog.action === 'approve'
                        ? `Approved #${dialog.row.id} — subscription activated.`
                        : `Rejected #${dialog.row.id} — user notified.`,
                });
                closeDialog();
                await load();
            } else {
                setToast({ kind: 'error', text: data.message || 'Failed.' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const statusChip = (status) => {
        if (status === 'pending') return <Chip size="small" label="Pending" color="warning" />;
        if (status === 'approved') return <Chip size="small" label="Approved" color="success" />;
        if (status === 'rejected') return <Chip size="small" label="Rejected" color="error" />;
        return <Chip size="small" label={status} />;
    };

    return (
        <Container maxWidth={settings.themeStretch ? false : 'xl'}>
            <Card>
                <CardHeader
                    avatar={<Iconify icon="mdi:bank-transfer" sx={{ fontSize: 28, color: 'primary.main' }} />}
                    title="Manual Payment Declarations"
                    subheader="PayNow / bank-transfer self-declarations. Verify against the bank statement before approving."
                    action={
                        <Button size="small" onClick={load} startIcon={<Iconify icon="mdi:refresh" />}>
                            Refresh
                        </Button>
                    }
                />
                <CardContent sx={{ pt: 0 }}>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                        {STATUS_FILTERS.map((f) => (<Tab key={f.key} value={f.key} label={f.label} />))}
                    </Tabs>

                    {toast && (
                        <Alert severity={toast.kind} onClose={() => setToast(null)} sx={{ mb: 2 }}>
                            {toast.text}
                        </Alert>
                    )}

                    {loading ? (
                        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
                    ) : rows.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                            No {tab === 'all' ? '' : tab} declarations.
                        </Box>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: 60 }}>#</TableCell>
                                    <TableCell>Declared</TableCell>
                                    <TableCell>Plan</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell>User</TableCell>
                                    <TableCell>Reference</TableCell>
                                    <TableCell sx={{ width: 110 }}>Status</TableCell>
                                    <TableCell align="right" sx={{ width: 200 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((r) => (
                                    <TableRow key={r.id} hover>
                                        <TableCell>{r.id}</TableCell>
                                        <TableCell>{fmtDate(r.declared_at)}</TableCell>
                                        <TableCell>
                                            <Stack spacing={0.25}>
                                                <span>{r.plan?.plan_name || `plan #${r.subscription_plan_id}`}</span>
                                                <Typography variant="caption" color="text.secondary">
                                                    {r.plan?.billing_cycle}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="right">{fmtSgd(r.amount)}</TableCell>
                                        <TableCell>
                                            <Stack spacing={0.25}>
                                                <span>{r.declared_email}</span>
                                                {r.registered_email && r.registered_email !== r.declared_email && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        registered: {r.registered_email}
                                                    </Typography>
                                                )}
                                                {r.registered_name && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {r.registered_name}
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            {r.reference || <span style={{ color: '#aaa' }}>—</span>}
                                            {r.note && (
                                                <Tooltip title={r.note} arrow><Box component="span" sx={{ ml: 0.5 }}>
                                                    <Iconify icon="mdi:note-outline" sx={{ fontSize: 14, verticalAlign: 'middle', color: 'text.secondary' }} />
                                                </Box></Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell>{statusChip(r.status)}</TableCell>
                                        <TableCell align="right">
                                            {r.status === 'pending' ? (
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <Button size="small" variant="contained" color="success"
                                                        startIcon={<Iconify icon="mdi:check" />}
                                                        onClick={() => openDialog(r, 'approve')}
                                                    >Approve</Button>
                                                    <Button size="small" variant="outlined" color="error"
                                                        startIcon={<Iconify icon="mdi:close" />}
                                                        onClick={() => openDialog(r, 'reject')}
                                                    >Reject</Button>
                                                </Stack>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">
                                                    {fmtDate(r.reviewed_at)}
                                                </Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!dialog} onClose={closeDialog} fullWidth maxWidth="sm">
                <DialogTitle>
                    {dialog?.action === 'approve' ? 'Approve declaration' : 'Reject declaration'} #{dialog?.row.id}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        <strong>{dialog?.row.declared_email}</strong> declared {fmtSgd(dialog?.row.amount)} for{' '}
                        <strong>{dialog?.row.plan?.plan_name}</strong>.
                        {dialog?.row.reference && (<> Reference: <code>{dialog.row.reference}</code>.</>)}
                    </Typography>
                    {dialog?.action === 'approve' ? (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            Approving will cancel any active subscription this user has, insert a new active
                            subscription, log the payment, and upgrade their tier. A confirmation email is sent.
                        </Alert>
                    ) : (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            Rejecting will mark this declaration as rejected and email the user explaining we
                            couldn&apos;t verify the transfer. No charge or grant happens.
                        </Alert>
                    )}
                    <TextField
                        label={dialog?.action === 'approve' ? 'Note for user (optional)' : 'Reason for rejection (recommended)'}
                        fullWidth multiline minRows={2} maxRows={6}
                        value={reviewerNote}
                        onChange={(e) => setReviewerNote(e.target.value)}
                        placeholder={dialog?.action === 'approve'
                            ? 'e.g. Verified PayNow transfer #ABC123 on 14 Jun.'
                            : 'e.g. We could not find a matching transfer in our bank statement.'}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog} disabled={submitting}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={dialog?.action === 'approve' ? 'success' : 'error'}
                        onClick={submitDecision}
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={16} /> : null}
                    >
                        {dialog?.action === 'approve' ? 'Confirm approve' : 'Confirm reject'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
