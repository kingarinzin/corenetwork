import { IntelRequest, entityOptions, urgencyOptions } from "../types";

export const generateBlankPrintHtml = () => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>CoRE NETWORK - Intelligence Request</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
          @media print { body { margin: 0; padding: 0; } }
          .print-container { max-width: 210mm; margin: 0 auto; background: white; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
          .logos { display: flex; gap: 10px; margin-bottom: 5px; }
          .section { margin-bottom: 20px; page-break-inside: avoid; }
          .section label { font-weight: bold; display: block; margin-bottom: 5px; font-size: 14px; }
          .checkbox-group { display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; margin-top: 5px; }
          .checkbox-item { display: flex; align-items: center; gap: 8px; }
          .checkbox-box { width: 16px; height: 16px; border: 1px solid #333; background: white; }
          .radio-group { display: flex; gap: 20px; margin-top: 5px; }
          .radio-item { display: flex; align-items: center; gap: 8px; }
          .radio-circle { width: 16px; height: 16px; border: 1px solid #333; border-radius: 50%; background: white; }
          .blank-line { border-bottom: 1px solid #ccc; min-height: 30px; margin-top: 5px; }
          .remarks-box { border: 1px solid #ccc; min-height: 100px; border-radius: 4px; margin-top: 5px; }
          .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="header">
            <div>
              <div class="logos"><img src="/form_logo.png" alt="Logo" style="height: 100px; width: auto;" /></div>
              <div><strong>Core Network</strong><br /><small>Request</small></div>
            </div>
            <div style="text-align: right;"><div>Form 01</div><div style="font-size:1.2rem;font-weight:bold;">Request Form</div></div>
          </div>
          <div class="section"><label>Entity:</label><div class="checkbox-group">${entityOptions.map(opt => `<div class="checkbox-item"><div class="checkbox-box"></div><span>${opt}</span></div>`).join('')}</div></div>
          <div class="section"><label>Purpose:</label><div class="blank-line"></div></div>
          <div class="section"><label>Urgency:</label><div class="radio-group">${urgencyOptions.map(opt => `<div class="radio-item"><div class="radio-circle"></div><span>${opt}</span></div>`).join('')}</div></div>
          <div class="section"><label>Remarks:</label><div class="remarks-box"></div></div>
          <div class="section"><label>Attachments:</label><div class="blank-line"></div><div class="blank-line"></div></div>
          <div class="section"><h4>Requesting Agency</h4><div class="two-columns">
            <div><label>Name of Requesting Officer:</label><div class="blank-line"></div></div>
            <div><label>Department:</label><div class="blank-line"></div></div>
            <div><label>Division:</label><div class="blank-line"></div></div>
            <div><label>Requesting Date:</label><div class="blank-line"></div></div>
          </div><div><label>Signature:</label><div class="blank-line"></div></div></div>
        </div>
        <script>window.onload = () => { window.print(); window.close(); };</script>
      </body>
    </html>
  `;
};

export const generateEntryPrintHtml = (req: IntelRequest) => {
  const attachmentsHtml = (req.attachments || []).map((att: any) => 
    `<div style="border-bottom:1px solid #ccc; padding:4px;">${typeof att === 'string' ? att : att.filename} (${typeof att === 'string' ? 'N/A' : att.classification})</div>`
  ).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Intel Request Form - ${req.purpose || "Request"}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
          @media print { body { margin: 0; padding: 0; } }
          .print-container { max-width: 210mm; margin: 0 auto; background: white; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
          .logos { display: flex; gap: 10px; margin-bottom: 5px; }
          .section { margin-bottom: 20px; page-break-inside: avoid; }
          .section label { font-weight: bold; display: block; margin-bottom: 5px; font-size: 14px; }
          .section .value { border-bottom: 1px solid #ccc; padding: 8px; margin-bottom: 10px; }
          .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="header">
            <div>
              <div class="logos"><img src="/form_logo.png" alt="Logo" style="height: 100px; width: auto;" /></div>
              <div><strong>Core Network</strong><br /><small>Request</small></div>
            </div>
            <div style="text-align: right;"><div>Form 01</div><div style="font-size:1.2rem;font-weight:bold;">Request Form</div></div>
          </div>
          <div class="section"><label>Entity/Entities:</label><div class="value">${req.entities?.join(", ") || "—"}</div></div>
          <div class="section"><label>Purpose:</label><div class="value">${req.purpose || "—"}</div></div>
          <div class="section"><label>Urgency:</label><div class="value">${req.urgency || "—"}</div></div>
          <div class="section"><label>Remarks:</label><div class="value" style="min-height:80px;">${(req.remarks || "—").replace(/\n/g, "<br/>")}</div></div>
          <div class="section"><label>Attachments:</label><div class="value">${attachmentsHtml || "None"}</div></div>
          <div class="section"><h4>Requesting Agency</h4><div class="two-columns">
            <div><label>Name:</label><div class="value">${req.requestingOfficer?.name || "—"}</div></div>
            <div><label>Department:</label><div class="value">${req.requestingOfficer?.department || "—"}</div></div>
            <div><label>Division:</label><div class="value">${req.requestingOfficer?.division || "—"}</div></div>
            <div><label>Date:</label><div class="value">${req.requestingDate ? new Date(req.requestingDate).toLocaleDateString() : "—"}</div></div>
          </div><div><label>Signature:</label><div class="value" style="font-style:italic;">Electronically submitted</div></div></div>
        </div>
        <script>window.onload = () => { window.print(); window.close(); };</script>
      </body>
    </html>
  `;
};