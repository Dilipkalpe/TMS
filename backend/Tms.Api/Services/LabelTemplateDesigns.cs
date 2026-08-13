namespace Tms.Api.Services;

/// <summary>Built-in DB template layouts (stored as template_json — not hard-coded in the React UI).</summary>
public static class LabelTemplateDesigns
{
    public static string CompactDefault => """
        {
          "width": 100,
          "height": 150,
          "border": true,
          "unit": "mm",
          "elements": [
            { "type": "image", "field": "CompanyLogo", "x": 4, "y": 4, "width": 22, "height": 12 },
            { "type": "text", "field": "CompanyName", "x": 28, "y": 5, "width": 68, "fontSize": 10, "bold": true },
            { "type": "line", "x": 3, "y": 18, "width": 94, "strokeWidth": 0.5 },
            { "type": "text", "label": "LR No", "field": "LRNo", "x": 4, "y": 22, "width": 92, "fontSize": 11, "bold": true },
            { "type": "text", "label": "Package", "field": "PackageDisplay", "x": 4, "y": 32, "width": 92, "fontSize": 11, "bold": true },
            { "type": "text", "label": "Booking", "field": "BookingNo", "x": 4, "y": 42, "width": 92, "fontSize": 9 },
            { "type": "text", "label": "Consignor", "field": "Consignor", "x": 4, "y": 52, "width": 92, "fontSize": 9 },
            { "type": "text", "label": "Consignee", "field": "Consignee", "x": 4, "y": 62, "width": 92, "fontSize": 9 },
            { "type": "text", "label": "From", "field": "From", "x": 4, "y": 72, "width": 45, "fontSize": 9 },
            { "type": "text", "label": "To", "field": "To", "x": 50, "y": 72, "width": 46, "fontSize": 9 },
            { "type": "text", "label": "Weight", "field": "Weight", "x": 4, "y": 82, "width": 45, "fontSize": 9 },
            { "type": "text", "label": "Vehicle", "field": "VehicleNo", "x": 50, "y": 82, "width": 46, "fontSize": 9 },
            { "type": "barcode", "field": "PackageId", "x": 4, "y": 96, "width": 92, "height": 28 },
            { "type": "text", "field": "PackageId", "x": 4, "y": 128, "width": 92, "fontSize": 8, "align": "center" }
          ]
        }
        """;

    /// <summary>Express shipping label: QR, FROM/TO blocks, package details, fragile stamp, tracking.</summary>
    public static string ExpressShippingStyle => """
        {
          "width": 100,
          "height": 150,
          "border": true,
          "unit": "mm",
          "elements": [
            { "type": "rect", "x": 2, "y": 2, "width": 96, "height": 146, "stroke": "#111", "strokeWidth": 1.5 },
            { "type": "qr", "field": "PackageId", "x": 5, "y": 5, "width": 28, "height": 28 },
            { "type": "text", "content": "EXPRESS SHIPMENT", "x": 36, "y": 5, "width": 58, "fontSize": 12, "bold": true, "uppercase": true },
            { "type": "text", "label": "Date", "field": "DateTime", "x": 36, "y": 14, "width": 58, "fontSize": 8 },
            { "type": "text", "label": "LR", "field": "LRNo", "x": 36, "y": 21, "width": 58, "fontSize": 8, "bold": true },
            { "type": "text", "label": "Pkg", "field": "PackageDisplay", "x": 36, "y": 28, "width": 58, "fontSize": 8, "bold": true },

            { "type": "line", "x": 3, "y": 36, "width": 94, "strokeWidth": 0.7 },

            { "type": "text", "content": "FROM", "x": 5, "y": 38, "width": 90, "fontSize": 8, "bold": true },
            { "type": "block", "field": "FromBlock", "x": 5, "y": 44, "width": 90, "height": 18, "fontSize": 8, "multiline": true },

            { "type": "line", "x": 3, "y": 64, "width": 94, "strokeWidth": 0.7 },

            { "type": "rect", "x": 4, "y": 66, "width": 58, "height": 40, "stroke": "#111", "strokeWidth": 0.8 },
            { "type": "text", "content": "TO", "x": 6, "y": 68, "width": 54, "fontSize": 8, "bold": true },
            { "type": "block", "field": "ToBlock", "x": 6, "y": 74, "width": 54, "height": 30, "fontSize": 9, "bold": true, "multiline": true },

            { "type": "rect", "x": 64, "y": 66, "width": 32, "height": 40, "stroke": "#111", "strokeWidth": 0.8 },
            { "type": "text", "content": "PACKAGE", "x": 66, "y": 68, "width": 28, "fontSize": 7, "bold": true },
            { "type": "text", "label": "Wt", "field": "Weight", "x": 66, "y": 75, "width": 28, "fontSize": 7 },
            { "type": "text", "label": "Type", "field": "PackageType", "x": 66, "y": 82, "width": 28, "fontSize": 7 },
            { "type": "text", "label": "Veh", "field": "VehicleNo", "x": 66, "y": 89, "width": 28, "fontSize": 7 },
            { "type": "text", "label": "From", "field": "From", "x": 66, "y": 96, "width": 28, "fontSize": 7 },

            { "type": "circle", "content": "FRAGILE\\nHANDLE\\nWITH CARE", "x": 70, "y": 108, "width": 22, "height": 22, "fontSize": 5.5, "strokeWidth": 1.4 },

            { "type": "line", "x": 3, "y": 108, "width": 64, "strokeWidth": 0.7 },
            { "type": "text", "content": "TRACKING NUMBER", "x": 5, "y": 110, "width": 62, "fontSize": 7, "bold": true },
            { "type": "barcode", "field": "PackageId", "x": 5, "y": 116, "width": 62, "height": 18 },
            { "type": "text", "field": "PackageId", "x": 4, "y": 136, "width": 92, "fontSize": 8, "bold": true, "align": "center" }
          ]
        }
        """;

    /// <summary>Shipping-label style (barcode focus) similar to courier shipping labels — keeps safe right margins.</summary>
    public static string ShippingBarcodeStyle => """
        {
          "width": 100,
          "height": 150,
          "border": true,
          "unit": "mm",
          "elements": [
            { "type": "rect", "x": 2, "y": 2, "width": 96, "height": 146, "stroke": "#111", "strokeWidth": 1.2 },
            { "type": "rect", "x": 2, "y": 2, "width": 96, "height": 14, "fill": "#111", "stroke": "#111" },
            { "type": "text", "content": "SHIPPING LABEL", "x": 4, "y": 5, "width": 92, "fontSize": 11, "bold": true, "align": "center", "color": "#fff", "uppercase": true },

            { "type": "text", "field": "CompanyName", "x": 4, "y": 19, "width": 60, "fontSize": 8, "bold": true },
            { "type": "text", "field": "CompanyAddress", "x": 4, "y": 25, "width": 60, "height": 12, "fontSize": 7, "multiline": true },
            { "type": "text", "label": "Date", "field": "DateTime", "x": 66, "y": 19, "width": 30, "fontSize": 7, "align": "right" },
            { "type": "text", "label": "Branch", "field": "Branch", "x": 66, "y": 26, "width": 30, "fontSize": 7, "align": "right" },

            { "type": "line", "x": 3, "y": 38, "width": 94, "strokeWidth": 1.2 },

            { "type": "text", "content": "SHIP TO", "x": 4, "y": 40, "width": 50, "fontSize": 8, "bold": true },
            { "type": "text", "field": "PackageDisplay", "x": 55, "y": 40, "width": 41, "fontSize": 14, "bold": true, "align": "right" },
            { "type": "text", "label": "Order", "field": "BookingNo", "x": 55, "y": 50, "width": 41, "fontSize": 7, "align": "right" },

            { "type": "block", "field": "ToBlock", "x": 4, "y": 48, "width": 70, "height": 36, "fontSize": 11, "bold": true, "multiline": true },

            { "type": "line", "x": 3, "y": 88, "width": 94, "strokeWidth": 1.5 },

            { "type": "rect", "x": 2, "y": 88, "width": 96, "height": 8, "fill": "#111" },
            { "type": "text", "content": "TRACKING # — PACKAGE ID", "x": 4, "y": 89.5, "width": 92, "fontSize": 8, "bold": true, "align": "center", "color": "#fff" },

            { "type": "barcode", "field": "PackageId", "x": 6, "y": 100, "width": 88, "height": 28 },
            { "type": "text", "field": "PackageId", "x": 4, "y": 132, "width": 92, "fontSize": 9, "bold": true, "align": "center" },

            { "type": "text", "label": "From", "field": "From", "x": 4, "y": 142, "width": 45, "fontSize": 7 },
            { "type": "text", "label": "To", "field": "To", "x": 50, "y": 142, "width": 46, "fontSize": 7 }
          ]
        }
        """;
}
