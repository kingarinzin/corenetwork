import { IntelReport, entityOptions, classificationOptions } from "../types";

export const generateBlankReportHtml = () => {
  return `
    <!DOCTYPE html><html><head><title>Intelligence Report - Blank</title>
    <style>body{font-family:Arial;margin:20px}.header{border-bottom:2px solid #333;margin-bottom:20px}.section{margin-bottom:20px;page-break-inside:avoid}.section label{font-weight:bold;display:block;margin-bottom:5px}.checkbox-group{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.checkbox-item{display:flex;align-items:center;gap:8px}.checkbox-box{width:16px;height:16px;border:1px solid #333}.blank-line{border-bottom:1px solid #ccc;min-height:30px;margin-top:5px}.remarks-box{border:1px solid #ccc;min-height:100px}.radio-group{display:flex;gap:20px}.radio-item{display:flex;align-items:center;gap:8px}.radio-circle{width:16px;height:16px;border:1px solid #333;border-radius:50%}.two-columns{display:grid;grid-template-columns:1fr 1fr;gap:20px}</style>
    </head><body>
    <div class="header"><h2>CoRE Network - Intelligence Report</h2></div>
    <div class="section"><label>Entities:</label><div class="checkbox-group">${entityOptions.map(opt => `<div class="checkbox-item"><div class="checkbox-box"></div>${opt}</div>`).join('')}</div></div>
    <div class="section"><label>Classification:</label><div class="radio-group">${classificationOptions.map(opt => `<div class="radio-item"><div class="radio-circle"></div>${opt}</div>`).join('')}</div></div>
    <div class="section"><label>Remarks:</label><div class="remarks-box"></div></div>
    <div class="section"><label>Submitted By:</label><div class="two-columns"><div><div class="blank-line"></div>Name</div><div><div class="blank-line"></div>Department</div></div></div>
    <script>window.onload=()=>{window.print();window.close();}</script>
    </body></html>`;
};

export const generateReportEntryHtml = (entry: IntelReport) => {
  return `
    <!DOCTYPE html><html><head><title>Intelligence Report</title>
    <style>body{font-family:Arial;margin:20px}.header{border-bottom:2px solid #333;margin-bottom:20px}.section{margin-bottom:20px}.section label{font-weight:bold}.value{border-bottom:1px solid #ccc;padding:8px;margin-bottom:10px}</style>
    </head><body>
    <div class="header"><h2>CoRE Network - Intelligence Report</h2></div>
    <div class="section"><label>Entities:</label><div class="value">${entry.entities.join(", ")}</div></div>
    <div class="section"><label>Classification:</label><div class="value">${entry.classification}</div></div>
    <div class="section"><label>Remarks:</label><div class="value" style="min-height:80px;">${(entry.remarks || "").replace(/\n/g, "<br/>")}</div></div>
    <div class="section"><label>Submitted By:</label><div class="value">${entry.submittedBy?.name || "-"} (${entry.submittedBy?.department || "-"})</div></div>
    <div class="section"><label>Date:</label><div class="value">${new Date(entry.createdAt).toLocaleDateString()}</div></div>
    <script>window.onload=()=>{window.print();window.close();}</script>
    </body></html>`;
};