'use client';

import Container from '@mui/material/Container';
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useSettingsContext } from 'src/components/settings';
import {
    create_order,
    create_order_item,
    delete_order,
    delete_order_item,
    get_orders,
    update_order,
} from 'src/components/api/api';
import Iconify from 'src/components/iconify';
import { format } from 'date-fns';

const fmtDate = (iso, pattern = 'yyyy-MM-dd') => {
    if (!iso) return '—';
    try { return format(new Date(iso), pattern); } catch { return String(iso); }
};

// ----------------------------------------------------------------------

const EMPTY_FORM = {
    customer_name: '',
    order_intent: '',
    subtotal: '',
    tax: '',
    total: '',
    order_paid: 0,
};

const EMPTY_ITEM = { item: '', quantity: '1', price: '' };

export default function OrdersListView() {
    const settings = useSettingsContext();
    const [orders, setOrders] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

    // ---- Data ----
    const getData = async () => {
        const res = await get_orders();
        if (res.status) setOrders(res.data);
    };

    useEffect(() => { getData(); }, []);

    // ---- Dialog helpers ----
    const handleOpen = (order = null) => {
        if (order) {
            setSelectedOrder(order);
            setForm({
                customer_name: order.customer_name ?? '',
                order_intent: order.order_intent ?? '',
                subtotal: order.subtotal ?? '',
                tax: order.tax ?? '',
                total: order.total ?? '',
                order_paid: order.order_paid ?? 0,
            });
            setItems((order.order_item ?? []).map((i) => ({
                id: i.id,
                item: i.item ?? '',
                quantity: i.quantity ?? '1',
                price: i.price ?? '',
            })));
        } else {
            setSelectedOrder(null);
            setForm(EMPTY_FORM);
            setItems([{ ...EMPTY_ITEM }]);
        }
        setOpenDialog(true);
    };

    const handleClose = () => { setOpenDialog(false); };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleItemChange = (idx, field, value) => {
        const next = [...items];
        next[idx] = { ...next[idx], [field]: value };
        setItems(next);
    };

    const handleAddItemRow = () => setItems([...items, { ...EMPTY_ITEM }]);

    const handleRemoveItemRow = (idx) => setItems(items.filter((_, i) => i !== idx));

    // ---- Submit ----
    const handleSubmit = async () => {
        let orderId;

        if (selectedOrder) {
            const res = await update_order({ id: selectedOrder.id, ...form });
            if (!res.status) { alert(res.message || 'Update failed'); return; }
            orderId = selectedOrder.id;

            // Delete existing items then re-create all
            for (const existing of (selectedOrder.order_item ?? [])) {
                await delete_order_item({ id: existing.id });
            }
        } else {
            const res = await create_order(form);
            if (!res.status) { alert(res.message || 'Create failed'); return; }
            orderId = res.data.id;
        }

        // Create all items
        for (const item of items) {
            if (!item.item) continue;
            await create_order_item({ order_id: orderId, ...item });
        }

        handleClose();
        getData();
    };

    // ---- Delete ----
    const handleDelete = async (order) => {
        if (!window.confirm(`Delete Order #${order.id}?`)) return;
        const res = await delete_order({ id: order.id });
        if (res.status) getData();
        else alert(res.message || 'Delete failed');
    };

    // ---- Invoice printer ----
    const handlePrintInvoice = (order) => {
        const orderItems = order.order_item ?? [];

        const itemRows = orderItems.map((i) => `
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">${i.item ?? ''}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;text-align:center;">${i.quantity ?? 1}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;text-align:right;">SGD ${parseFloat(i.price || 0).toFixed(2)}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;text-align:right;">SGD ${(parseFloat(i.quantity || 1) * parseFloat(i.price || 0)).toFixed(2)}</td>
            </tr>
        `).join('');

        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const invoiceDate = fmtDate(order.created_at, 'dd MMM yyyy');

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Invoice #${order.id}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #333; background: #fff; padding: 40px; }
        .page { max-width: 760px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .logo { height: 60px; object-fit: contain; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #1a237e; }
        .invoice-meta { font-size: 12px; color: #555; margin-top: 4px; }
        .section-title { font-weight: bold; font-size: 14px; margin-bottom: 6px; color: #1a237e; }
        .info-block { margin-bottom: 24px; }
        .info-block p { margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        thead tr { background: #1a237e; color: #fff; }
        thead th { padding: 10px 12px; text-align: left; font-size: 12px; }
        thead th:last-child, thead th:nth-child(3) { text-align: right; }
        thead th:nth-child(2) { text-align: center; }
        tfoot td { padding: 8px 12px; font-weight: bold; }
        .totals { text-align: right; margin-bottom: 32px; }
        .totals p { margin: 4px 0; }
        .totals .grand { font-size: 16px; font-weight: bold; color: #1a237e; }
        .payment-section { display: flex; gap: 40px; margin-top: 16px; border-top: 2px solid #1a237e; padding-top: 24px; }
        .bank-details { flex: 1; }
        .paynow-section { text-align: center; }
        .paynow-img { width: 150px; height: 150px; object-fit: contain; border: 1px solid #e0e0e0; padding: 4px; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .badge-paid { background: #e8f5e9; color: #2e7d32; }
        .badge-unpaid { background: #fff3e0; color: #e65100; }
        @media print {
            body { padding: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <img class="logo" src="${origin}/logo/logo.png" alt="Logo" />
            <div style="text-align:right;">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-meta">Invoice No: #${order.id}</div>
                <div class="invoice-meta">Date: ${invoiceDate}</div>
                <div class="invoice-meta" style="margin-top:6px;">
                    <span class="badge ${order.order_paid ? 'badge-paid' : 'badge-unpaid'}">
                        ${order.order_paid ? 'PAID' : 'UNPAID'}
                    </span>
                </div>
            </div>
        </div>

        <div style="display:flex;gap:40px;margin-bottom:32px;">
            <div class="info-block" style="flex:1;">
                <div class="section-title">Bill To</div>
                <p><strong>${order.customer_name ?? '-'}</strong></p>
                ${order.order_intent ? `<p style="color:#777;margin-top:4px;">${order.order_intent}</p>` : ''}
            </div>
            <div class="info-block" style="flex:1;">
                <div class="section-title">Issued By</div>
                <p><strong>Human Capital Consulting & Services (Spore) Pte Ltd</strong></p>
                <p>10 Anson Road #33-15, International Plaza, Singapore 079903</p>
                <p>Email: enquiry@hccs.com</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align:center;">Qty</th>
                    <th style="text-align:right;">Unit Price</th>
                    <th style="text-align:right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows || '<tr><td colspan="4" style="padding:12px;color:#999;text-align:center;">No items</td></tr>'}
            </tbody>
        </table>

        <div class="totals">
            <p>Subtotal: <strong>SGD ${parseFloat(order.subtotal || 0).toFixed(2)}</strong></p>
            <p>Tax: <strong>SGD ${parseFloat(order.tax || 0).toFixed(2)}</strong></p>
            <p class="grand">Total: SGD ${parseFloat(order.total || 0).toFixed(2)}</p>
        </div>

        <div class="payment-section">
            <div class="bank-details">
                <div class="section-title">Bank Transfer</div>
                <p style="margin-top:8px;"><strong>Bank:</strong> CIMB Bank Berhad</p>
                <p><strong>Account Name:</strong> Human Capital Consulting & Services (Spore) Pte Ltd</p>
                <p><strong>Account No:</strong> 8001-2345-6789</p>
                <p><strong>Reference:</strong> Invoice #${order.id}</p>
            </div>
            <div class="paynow-section">
                <div class="section-title">PayNow </div>
                <img class="paynow-img" src="${origin}/paynow.png" alt="PayNow QR" />
                <p style="font-size:11px;color:#777;margin-top:4px;">Scan to pay</p>
            </div>
        </div>

        <div style="text-align:center;margin-top:40px;font-size:11px;color:#aaa;">
            Thank you for your business. For inquiries, contact billing@hccs.com
        </div>
    </div>
    <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
    };

    return (
        <Container maxWidth={settings.themeStretch ? false : 'xl'}>
            <Card>
                <CardHeader
                    title="Orders"
                    action={
                        <Button variant="contained" onClick={() => handleOpen()}>
                            + New Order
                        </Button>
                    }
                />
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>#</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Intent / Notes</TableCell>
                                <TableCell>Subtotal</TableCell>
                                <TableCell>Tax</TableCell>
                                <TableCell>Total</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {orders.map((o) => (
                                <TableRow key={o.id}>
                                    <TableCell>{o.id}</TableCell>
                                    <TableCell>{o.customer_name ?? '-'}</TableCell>
                                    <TableCell>{o.order_intent ?? '-'}</TableCell>
                                    <TableCell>SGD {parseFloat(o.subtotal || 0).toFixed(2)}</TableCell>
                                    <TableCell>SGD {parseFloat(o.tax || 0).toFixed(2)}</TableCell>
                                    <TableCell><strong>SGD {parseFloat(o.total || 0).toFixed(2)}</strong></TableCell>
                                    <TableCell>
                                        <Chip
                                            label={o.order_paid ? 'Paid' : 'Unpaid'}
                                            color={o.order_paid ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption">
                                            {fmtDate(o.created_at)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" gap={0.5}>
                                            <IconButton size="small" onClick={() => handlePrintInvoice(o)} title="Download Invoice">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m12 15.577l-3.539-3.538l.708-.72L11.5 13.65V5h1v8.65l2.33-2.33l.709.719zM6.616 19q-.691 0-1.153-.462T5 17.384v-2.423h1v2.423q0 .231.192.424t.423.192h10.77q.23 0 .423-.192t.192-.424v-2.423h1v2.423q0 .691-.462 1.153T17.384 19z"/></svg>
                                            </IconButton>
                                            <IconButton  onClick={() => handleOpen(o)} title="Edit">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 19h1.425L16.2 9.225L14.775 7.8L5 17.575zm-2 2v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.438.65T21 6.4q0 .4-.137.763t-.438.662L7.25 21zM19 6.4L17.6 5zm-3.525 2.125l-.7-.725L16.2 9.225z"/></svg>
                                            </IconButton>
                                            <IconButton  onClick={() => handleDelete(o)} title="Delete">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M7.616 20q-.672 0-1.144-.472T6 18.385V6H5V5h4v-.77h6V5h4v1h-1v12.385q0 .69-.462 1.153T16.384 20zM17 6H7v12.385q0 .269.173.442t.443.173h8.769q.23 0 .423-.192t.192-.424zM9.808 17h1V8h-1zm3.384 0h1V8h-1zM7 6v13z"/></svg>
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9}>
                                        <Typography variant="body2" color="text.secondary" align="center">
                                            No orders found.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog open={openDialog} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle>{selectedOrder ? `Edit Order #${selectedOrder.id}` : 'New Order'}</DialogTitle>
                <DialogContent>
                    <Stack direction="column" gap={2} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                            <TextField
                                fullWidth
                                label="Customer Name"
                                name="customer_name"
                                value={form.customer_name}
                                onChange={handleChange}
                            />
                            <TextField
                                fullWidth
                                label="Order Intent / Notes"
                                name="order_intent"
                                value={form.order_intent}
                                onChange={handleChange}
                            />
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                            <TextField
                                fullWidth
                                label="Subtotal (SGD)"
                                name="subtotal"
                                type="number"
                                value={form.subtotal}
                                onChange={handleChange}
                            />
                            <TextField
                                fullWidth
                                label="Tax (SGD)"
                                name="tax"
                                type="number"
                                value={form.tax}
                                onChange={handleChange}
                            />
                            <TextField
                                fullWidth
                                label="Total (SGD)"
                                name="total"
                                type="number"
                                value={form.total}
                                onChange={handleChange}
                            />
                        </Stack>

                        <TextField
                            label="Payment Status"
                            name="order_paid"
                            select
                            value={form.order_paid}
                            onChange={handleChange}
                        >
                            <MenuItem value={0}>Unpaid</MenuItem>
                            <MenuItem value={1}>Paid</MenuItem>
                        </TextField>

                        <Divider />
                        <Typography variant="subtitle1">Line Items</Typography>

                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Description</TableCell>
                                    <TableCell width={100}>Qty</TableCell>
                                    <TableCell width={140}>Unit Price (SGD)</TableCell>
                                    <TableCell width={50} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((row, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                value={row.item}
                                                onChange={(e) => handleItemChange(idx, 'item', e.target.value)}
                                                placeholder="Item description"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                value={row.quantity}
                                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                type="number"
                                                value={row.price}
                                                onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={() => handleRemoveItemRow(idx)}>
                                                <Iconify icon="tabler:trash" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <Button variant="outlined" size="small" onClick={handleAddItemRow}>
                            + Add Item
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        {selectedOrder ? 'Save Changes' : 'Create Order'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
