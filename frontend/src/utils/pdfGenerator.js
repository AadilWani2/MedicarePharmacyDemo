import { jsPDF } from 'jspdf';

/**
 * Generates a professional tax invoice PDF for a sale transaction.
 * @param {Object} sale - The sale data object.
 * @param {string} mode - 'download' to download file directly, 'print' to open print window.
 */
export const generateInvoicePDF = (sale, mode = 'download') => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Top header color band
  doc.setFillColor(30, 58, 138); // Deep Blue (#1e3a8a)
  doc.rect(0, 0, 210, 8, 'F');

  // Header Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138);
  doc.text('MEDICARE PHARMACY', 15, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate
  doc.text('Residency Road, Srinagar, J&K - 190001', 15, 27);
  doc.text('GSTIN: 01ABCDE1234F1Z5 | Drug License: JK/PHARMA/2026/4587', 15, 32);
  doc.text('Contact: +91 98765 43210 | Email: srinagar.medicare@gmail.com', 15, 37);

  // Invoice Meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('TAX INVOICE', 150, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Invoice No: ${sale.billNumber || 'TEMP-BILL'}`, 150, 27);
  doc.text(`Date: ${new Date(sale.saleDate || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`, 150, 32);
  doc.text(`Payment: ${String(sale.paymentMethod || 'cash').toUpperCase()}`, 150, 37);

  // Horizontal divider
  doc.setDrawColor(226, 232, 240); // gray-200
  doc.setLineWidth(0.4);
  doc.line(15, 42, 195, 42);

  // Customer Details Block
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 46, 180, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CUSTOMER INFO:', 20, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Name:   ${sale.customerName || 'Walk-in Customer'}`, 20, 58);
  doc.text(`Phone:  ${sale.customerPhone || 'N/A'}`, 20, 63);

  doc.text(`Status:  Paid`, 130, 52);
  doc.text(`Billed By: Store Executive`, 130, 58);
  if (sale.customerGSTIN) {
    doc.text(`Customer GSTIN: ${sale.customerGSTIN}`, 130, 63);
  }

  // Table Headers
  const tableTop = 78;
  doc.setFillColor(30, 58, 138); // Deep Blue
  doc.roundedRect(15, tableTop, 180, 8, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('S.No', 18, tableTop + 5.5);
  doc.text('Medicine / Item Name', 28, tableTop + 5.5);
  doc.text('Batch No', 105, tableTop + 5.5);
  doc.text('Qty', 135, tableTop + 5.5, { align: 'right' });
  doc.text('Unit Price', 162, tableTop + 5.5, { align: 'right' });
  doc.text('Amount', 190, tableTop + 5.5, { align: 'right' });

  // Table Rows
  let y = tableTop + 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  const items = sale.items || [];
  items.forEach((item, index) => {
    y += 8;

    // Page Break check
    if (y > 250) {
      doc.addPage();
      // Reset top band and headers on new page
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, 210, 8, 'F');
      
      // Re-draw headers
      doc.setFillColor(30, 58, 138);
      doc.roundedRect(15, 15, 180, 8, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('S.No', 18, 20.5);
      doc.text('Medicine / Item Name', 28, 20.5);
      doc.text('Batch No', 105, 20.5);
      doc.text('Qty', 135, 20.5, { align: 'right' });
      doc.text('Unit Price', 162, 20.5, { align: 'right' });
      doc.text('Amount', 190, 20.5, { align: 'right' });

      y = 31;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
    }

    // Zebra striping
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 6, 180, 8, 'F');
    }

    // Border line below row
    doc.setDrawColor(241, 245, 249);
    doc.line(15, y + 2, 195, y + 2);

    doc.text(String(index + 1), 18, y - 1);
    doc.text(item.medicineName || 'Unknown Medicine', 28, y - 1);
    doc.text(item.batchNumber || 'N/A', 105, y - 1);
    doc.text(String(item.quantity), 135, y - 1, { align: 'right' });
    doc.text(`₹${Number(item.unitPrice || 0).toFixed(2)}`, 162, y - 1, { align: 'right' });
    doc.text(`₹${Number(item.totalPrice || (item.quantity * item.unitPrice) || 0).toFixed(2)}`, 190, y - 1, { align: 'right' });
  });

  // Check room for calculations and footer, otherwise add new page
  if (y > 215) {
    doc.addPage();
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 8, 'F');
    y = 20;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 135, y);
  doc.setTextColor(15, 23, 42);
  doc.text(`\u20b9${Number(sale.subtotal || 0).toFixed(2)}`, 190, y, { align: 'right' });

  y += 6;
  doc.setTextColor(71, 85, 105);
  doc.text('Discount:', 135, y);
  doc.setTextColor(220, 38, 38); // Red
  doc.text(`- \u20b9${Number(sale.discount || 0).toFixed(2)}`, 190, y, { align: 'right' });

  // GST Breakdown
  if (sale.totalGST > 0) {
    y += 8;
    doc.setDrawColor(226, 232, 240);
    doc.line(130, y - 4, 195, y - 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('GST BREAKDOWN', 135, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    y += 5;
    doc.setTextColor(71, 85, 105);
    doc.text('Taxable Amount:', 135, y);
    doc.setTextColor(15, 23, 42);
    doc.text(`\u20b9${Number(sale.totalTaxableAmount || 0).toFixed(2)}`, 190, y, { align: 'right' });

    if (!sale.isInterState) {
      y += 5;
      doc.setTextColor(71, 85, 105);
      doc.text('CGST:', 135, y);
      doc.setTextColor(15, 23, 42);
      doc.text(`\u20b9${Number(sale.totalCGST || 0).toFixed(2)}`, 190, y, { align: 'right' });

      y += 5;
      doc.setTextColor(71, 85, 105);
      doc.text('SGST:', 135, y);
      doc.setTextColor(15, 23, 42);
      doc.text(`\u20b9${Number(sale.totalSGST || 0).toFixed(2)}`, 190, y, { align: 'right' });
    } else {
      y += 5;
      doc.setTextColor(71, 85, 105);
      doc.text('IGST:', 135, y);
      doc.setTextColor(15, 23, 42);
      doc.text(`\u20b9${Number(sale.totalIGST || 0).toFixed(2)}`, 190, y, { align: 'right' });
    }
  }

  y += 8;
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.line(130, y - 5, 195, y - 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // Deep Blue
  doc.text('Total Paid:', 135, y);
  doc.text(`\u20b9${Number(sale.totalAmount || 0).toFixed(2)}`, 190, y, { align: 'right' });

  // Footer notes block
  y += 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y - 6, 195, y - 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Terms & Conditions:', 15, y);
  doc.text('1. Billed medicines are subject to replacement only in case of manufacturer defect.', 15, y + 4);
  doc.text('2. Please double-check expiry details of medications before usage.', 15, y + 8);

  // Signature line
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.line(150, y + 10, 190, y + 10);
  doc.text('Authorized Signature', 156, y + 14);

  // Hearty closing phrase
  y += 24;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text('*** Get Well Soon! ***', 105, y, { align: 'center' });

  // Output Mode
  const filename = `${sale.billNumber || 'invoice'}.pdf`;
  if (mode === 'print') {
    // For direct print, open PDF in new tab and call window.print
    const pdfBlob = doc.output('bloburl');
    window.open(pdfBlob, '_blank');
  } else {
    // Download PDF directly
    doc.save(filename);
  }
};

/**
 * Generates a professional Supplier Return Memo PDF for expiring inventory returns.
 * @param {Object} memo - The return memo data object containing supplier details and items list.
 */
export const generateReturnMemoPDF = (memo) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Top header color band
  doc.setFillColor(220, 38, 38); // Red for Return Memo (#dc2626)
  doc.rect(0, 0, 210, 8, 'F');

  // Header Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(220, 38, 38);
  doc.text('MEDICARE PHARMACY', 15, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Residency Road, Srinagar, J&K - 190001', 15, 27);
  doc.text('GSTIN: 01ABCDE1234F1Z5 | Drug License: JK/PHARMA/2026/4587', 15, 32);

  // Memo Meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('SUPPLIER RETURN MEMO', 125, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Memo No: MEMO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`, 125, 27);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}`, 125, 32);
  doc.text(`Payment Terms: ${memo.supplier?.paymentTerms || 'N/A'}`, 125, 37);

  // Horizontal divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(15, 42, 195, 42);

  // Supplier Details Block
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 46, 180, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SUPPLIER INFO:', 20, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Name:   ${memo.supplier?.name || 'Unknown Supplier'}`, 20, 58);
  doc.text(`Phone:  ${memo.supplier?.phone || 'N/A'}`, 20, 63);
  doc.text(`Email:  ${memo.supplier?.email || 'N/A'}`, 115, 58);

  // Table Headers
  const tableTop = 78;
  doc.setFillColor(220, 38, 38); // Red
  doc.roundedRect(15, tableTop, 180, 8, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('S.No', 18, tableTop + 5.5);
  doc.text('Medicine / Expiring Item Name', 28, tableTop + 5.5);
  doc.text('Batch No', 105, tableTop + 5.5);
  doc.text('Qty', 135, tableTop + 5.5, { align: 'right' });
  doc.text('Cost Price', 162, tableTop + 5.5, { align: 'right' });
  doc.text('Credit Value', 190, tableTop + 5.5, { align: 'right' });

  // Table Rows
  let y = tableTop + 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  const items = memo.items || [];
  let totalCredit = 0;
  items.forEach((item, index) => {
    y += 8;
    totalCredit += item.totalValue || (item.quantity * item.purchasePrice);

    // Page Break check
    if (y > 250) {
      doc.addPage();
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, 210, 8, 'F');
      
      doc.setFillColor(220, 38, 38);
      doc.roundedRect(15, 15, 180, 8, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('S.No', 18, 20.5);
      doc.text('Medicine / Expiring Item Name', 28, 20.5);
      doc.text('Batch No', 105, 20.5);
      doc.text('Qty', 135, 20.5, { align: 'right' });
      doc.text('Cost Price', 162, 20.5, { align: 'right' });
      doc.text('Credit Value', 190, 20.5, { align: 'right' });

      y = 31;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 6, 180, 8, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(15, y + 2, 195, y + 2);

    doc.text(String(index + 1), 18, y - 1);
    doc.text(item.name || 'Unknown', 28, y - 1);
    doc.text(item.batchNumber || 'N/A', 105, y - 1);
    doc.text(String(item.quantity), 135, y - 1, { align: 'right' });
    doc.text(`₹${Number(item.purchasePrice || 0).toFixed(2)}`, 162, y - 1, { align: 'right' });
    doc.text(`₹${Number(item.totalValue || (item.quantity * item.purchasePrice)).toFixed(2)}`, 190, y - 1, { align: 'right' });
  });

  if (y > 215) {
    doc.addPage();
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, 210, 8, 'F');
    y = 20;
  }

  // Totals calculations block
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.text('Total Credit Claim:', 125, y);
  doc.text(`₹${Number(totalCredit).toFixed(2)}`, 190, y, { align: 'right' });

  // Footer notes block
  y += 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y - 6, 195, y - 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Notes on Return Policy:', 15, y);
  doc.text('1. Expiring items are returned under credit note terms as agreed in supplier payment contract.', 15, y + 4);
  doc.text('2. Please process the corresponding credit note value against outstanding ledger balances.', 15, y + 8);

  // Signature line
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.line(150, y + 10, 190, y + 10);
  doc.text('Store Manager Signature', 150, y + 14);

  // Output Mode
  const filename = `return_memo_${String(memo.supplier?.name || 'supplier').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};
