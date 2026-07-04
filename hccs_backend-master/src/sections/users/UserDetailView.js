'use client';

import Container from '@mui/material/Container';
import { useSettingsContext } from 'src/components/settings';
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Divider,
    MenuItem,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { get_user_detail, get_user_subscriptions, get_user_tiers, update_user } from 'src/components/api/api';
import { format } from 'date-fns';

const fmtDate = (iso, pattern = 'yyyy-MM-dd') => {
    if (!iso) return '—';
    try { return format(new Date(iso), pattern); } catch { return String(iso); }
};

// ----------------------------------------------------------------------

export default function UserDetailView({ id }) {
    const settings = useSettingsContext();

    const [data, setData] = useState(null);
    const [tiers, setTiers] = useState([]);
    const [selectedTierId, setSelectedTierId] = useState('');
    const [saving, setSaving] = useState(false);
    const [subscriptions, setSubscriptions] = useState([]);
    const [selectedTab, setSelectedTab] = useState('info');

    const getData = async () => {
        const [resUser, resTiers] = await Promise.all([
            get_user_detail({ id }),
            get_user_tiers(),
        ]);
        if (resUser.status) {
            setData(resUser.data);
            setSelectedTierId(resUser.data.user_tier_id ?? '');
        }
        if (resTiers.status) {
            setTiers(resTiers.data);
        }
        const resSubs = await get_user_subscriptions({ id });
        if (resSubs.status) setSubscriptions(resSubs.data);
    };

    const handleSaveTier = async () => {
        setSaving(true);
        const res = await update_user({ id, user_tier_id: selectedTierId || null });
        if (res.status) {
            await getData();
        } else {
            alert(res.message || 'Failed to update tier.');
        }
        setSaving(false);
    };

    useEffect(() => {
        getData();
    }, []);

    if (!data) return null;

    return (
        <Container maxWidth={settings.themeStretch ? false : 'xl'}>
            <Card>
                <CardHeader title="User Detail" />
                <CardContent>
                    <Stack direction="column" gap={2}>
                        <table>
                            <tbody>
                                <tr>
                                    <td style={{ fontWeight: 'bold', paddingRight: '16px', paddingBottom: '8px' }}>Email</td>
                                    <td>{data.email}</td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 'bold', paddingRight: '16px', paddingBottom: '8px' }}>Register Date</td>
                                    <td>{fmtDate(data.created_at)}</td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 'bold', paddingRight: '16px', paddingBottom: '8px' }}>Current Tier</td>
                                    <td>{data.user_tier?.name ?? '—'}</td>
                                </tr>
                            </tbody>
                        </table>

                        <Divider />

                        <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
                            <Tab label="Assign Tier" value="info" />
                            <Tab label={`Subscriptions (${subscriptions.length})`} value="subscriptions" />
                        </Tabs>

                        {selectedTab === 'info' && (
                            <>
                                <Typography variant="subtitle1">Assign Tier</Typography>
                                <Stack direction="row" gap={2} alignItems="center">
                                    <TextField
                                        label="Tier"
                                        select
                                        size="small"
                                        value={selectedTierId}
                                        onChange={(e) => setSelectedTierId(e.target.value)}
                                        style={{ minWidth: 200 }}
                                    >
                                        <MenuItem value="">— None —</MenuItem>
                                        {tiers.map((t) => (
                                            <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                                        ))}
                                    </TextField>
                                    <Button variant="contained" onClick={handleSaveTier} disabled={saving}>
                                        {saving ? 'Saving…' : 'Save'}
                                    </Button>
                                </Stack>
                            </>
                        )}

                        {selectedTab === 'subscriptions' && (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>#</TableCell>
                                        <TableCell>Plan</TableCell>
                                        <TableCell>Billing</TableCell>
                                        <TableCell>Price</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Starts</TableCell>
                                        <TableCell>Ends</TableCell>
                                        <TableCell>Auto Renew</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {subscriptions.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell>{s.id}</TableCell>
                                            <TableCell>{s.subscription_plan?.name ?? '—'}</TableCell>
                                            <TableCell>{s.subscription_plan?.billing_cycle ?? '—'}</TableCell>
                                            <TableCell>
                                                {s.subscription_plan
                                                    ? `${s.subscription_plan.currency} ${parseFloat(s.subscription_plan.price).toFixed(2)}`
                                                    : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={s.status}
                                                    size="small"
                                                    color={
                                                        s.status === 'active' ? 'success'
                                                        : s.status === 'expired' ? 'error'
                                                        : s.status === 'cancelled' ? 'default'
                                                        : 'warning'
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {fmtDate(s.starts_at)}
                                            </TableCell>
                                            <TableCell>
                                                {fmtDate(s.ends_at)}
                                            </TableCell>
                                            <TableCell>{s.auto_renew ? 'Yes' : 'No'}</TableCell>
                                        </TableRow>
                                    ))}
                                    {subscriptions.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8}>
                                                <Typography variant="body2" color="text.secondary">
                                                    No subscriptions found.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </Container>
    );
}
