sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/Button"
], function (Controller, JSONModel, MessageBox, Dialog, List, StandardListItem, Button) {

    "use strict";

    // ─────────────────────────────────────────────────────────────────
    // CAP OData V4 base URL — matches your CDS service name exactly.
    // Check http://localhost:4004 after cds watch to confirm the path.
    // ─────────────────────────────────────────────────────────────────
    const BASE_URL = "/po";

    // ─────────────────────────────────────────────────────────────────
    // Minimal fetch wrapper — replaces util/service.js
    // method : "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    // body   : plain JS object (will be JSON stringified) or null
    // ─────────────────────────────────────────────────────────────────
    async function callOData(path, method, body) {
        const options = {
            method: method,
            headers: { "Content-Type": "application/json" }
        };
        if (body && method !== "GET") {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(BASE_URL + path, options);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `HTTP ${response.status}`);
        }
        // DELETE returns 204 — no body
        if (response.status === 204) return null;
        const json = await response.json();
        // OData V4 wraps results in { value: [...] }
        return json.value !== undefined ? json.value : json;
    }

    return Controller.extend("aayush.controller.Purchase", {

        // ─────────────────────────────────────────────────────────────
        // onInit — set up JSON model with all UI state + payload shapes
        // ─────────────────────────────────────────────────────────────
        onInit: function () {

            const oModel = new JSONModel({

                // ── navigation state ──
                showOperationSelector: true,
                showCreatePanel: false,
                showReadPanel: false,
                showUpdatePanel: false,

                // ── create form payload ──
                // Field names must match your CDS entity EXACTLY
                createPayload: {
                    EBELN: "",        // PO Number — leave blank for auto-generate
                    BUKRS: "",        // Company Code
                    BSART: "",        // PO Type
                    LIFNR: "",        // Vendor
                    AEDAT: "",        // Order Date
                    ZTERM: "",        // Payment Terms
                    currency: "",     // Currency
                    items: [
                        {
                            EBELP: 10,    // Item Number — first item always 10
                            MATNR: "",    // Material
                            MENGE: null,  // Quantity
                            MEINS: "",    // Unit of Measure
                            WERKS: "",    // Plant
                            NETPR: null   // Net Price
                        }
                    ]
                },

                // ── read results ──
                POHeader: [],
                POItems: [],

                // ── update state ──
                searchItemId: "",
                editItemMode: false,
                editItemPayload: {},

                // ── F4 value help lists ──
                vendorList: [],
                materialList: []
            });

            this.getView().setModel(oModel);

            // Pre-load F4 lists on startup
            // this._loadVendors();
            // this._loadMaterials();
        },

        // ─────────────────────────────────────────────────────────────
        // F4 — load vendors and materials from CAP service
        // Adjust entity set names to match your CDS service definition
        // ─────────────────────────────────────────────────────────────
        _loadVendors: function () {
            callOData("/Vendors", "GET", null)
                .then(data => {
                    this.getView().getModel().setProperty("/vendorList", data || []);
                })
                .catch(() => {
                    // Non-critical — just log, don't block the app
                    console.warn("Vendor list could not be loaded");
                });
        },

        _loadMaterials: function () {
            callOData("/Materials", "GET", null)
                .then(data => {
                    this.getView().getModel().setProperty("/materialList", data || []);
                })
                .catch(() => {
                    console.warn("Material list could not be loaded");
                });
        },

        // ─────────────────────────────────────────────────────────────
        // F4 Help — Vendor
        // ─────────────────────────────────────────────────────────────
        onVendorF4Help: function () {
            this._openF4Dialog("vendorList", "Select Vendor", "LIFNR", "name",
                function (selected) {
                    this.getView().getModel().setProperty("/createPayload/LIFNR", selected.LIFNR);
                }.bind(this)
            );
        },

        // ─────────────────────────────────────────────────────────────
        // F4 Help — Material (row-level: each item row has its own F4)
        // oEvent gives us the row binding context
        // ─────────────────────────────────────────────────────────────
        onMaterialF4Help: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            this._openF4Dialog("materialList", "Select Material", "MATNR", "description",
                function (selected) {
                    // Mutate the bound row object directly
                    const oObj = oContext.getObject();
                    oObj.MATNR = selected.MATNR;
                    // Refresh model so the Input re-renders with new value
                    this.getView().getModel().refresh(true);
                }.bind(this)
            );
        },

        // ─────────────────────────────────────────────────────────────
        // Generic F4 dialog builder
        // listPath   : JSONModel path holding the items array
        // title      : dialog title
        // keyField   : field name used as the "id" (e.g. "LIFNR")
        // labelField : field name shown as the display label (e.g. "name")
        // onSelect   : callback(selectedObject)
        // ─────────────────────────────────────────────────────────────
        _openF4Dialog: function (listPath, title, keyField, labelField, onSelect) {

            const oModel = this.getView().getModel();

            const oList = new List({
                mode: "SingleSelectMaster",
                items: {
                    path: "/" + listPath,
                    template: new StandardListItem({
                        title: "{" + labelField + "}",
                        description: "{" + keyField + "}"
                    })
                }
            });

            const oDialog = new Dialog({
                title: title,
                content: [oList],
                beginButton: new Button({
                    text: "Select",
                    type: "Emphasized",
                    press: function () {
                        const oSelected = oList.getSelectedItem();
                        if (!oSelected) {
                            MessageBox.warning("Please select an entry.");
                            return;
                        }
                        onSelect(oSelected.getBindingContext().getObject());
                        oDialog.close();
                        oDialog.destroy();
                    }
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        oDialog.close();
                        oDialog.destroy();
                    }
                })
            });

            // Bind model so the list inside the dialog can resolve paths
            oDialog.setModel(oModel);
            oDialog.open();
        },

        // ─────────────────────────────────────────────────────────────
        // Navigation helpers
        // ─────────────────────────────────────────────────────────────
        onSelectCreate: function () { this._toggle("create"); },
        onSelectRead:   function () { this._toggle("read");   this.onLoadData(); },
        onSelectUpdate: function () { this._toggle("update"); },

        _toggle: function (mode) {
            const m = this.getView().getModel();
            m.setProperty("/showOperationSelector", false);
            m.setProperty("/showCreatePanel",  mode === "create");
            m.setProperty("/showReadPanel",    mode === "read");
            m.setProperty("/showUpdatePanel",  mode === "update");
        },

        onBack: function () {
            const m = this.getView().getModel();
            m.setProperty("/showOperationSelector", true);
            m.setProperty("/showCreatePanel",  false);
            m.setProperty("/showReadPanel",    false);
            m.setProperty("/showUpdatePanel",  false);
            m.setProperty("/editItemMode",     false);
            this._resetCreatePayload();
        },

        // ─────────────────────────────────────────────────────────────
        // CREATE — deep insert (PO header + items in one POST)
        // CAP handles composition automatically when items are nested
        // ─────────────────────────────────────────────────────────────
        onSaveCombined: function () {

            const m = this.getView().getModel();
            const payload = m.getProperty("/createPayload");

            // Basic validation
            if (!payload.LIFNR) {
                MessageBox.error("Vendor (LIFNR) is required.");
                return;
            }
            if (!payload.AEDAT) {
                MessageBox.error("Order Date (AEDAT) is required.");
                return;
            }

            // Remove empty item rows before sending
            payload.items = payload.items.filter(i => i.MATNR && i.MATNR.trim() !== "");

            if (payload.items.length === 0) {
                MessageBox.error("At least one PO item with a material is required.");
                return;
            }

            callOData("/PurchaseOrders", "POST", payload)
                .then(() => {
                    MessageBox.success("Purchase Order created successfully.");
                    this.onBack();
                })
                .catch(err => {
                    MessageBox.error("Create failed: " + err.message);
                });
        },

        // ─────────────────────────────────────────────────────────────
        // ADD ITEM ROW — appends a blank item to the items array
        // EBELP increments by 10 (SAP convention: 10, 20, 30...)
        // ─────────────────────────────────────────────────────────────
        onAddItem: function () {
            const m = this.getView().getModel();
            const items = m.getProperty("/createPayload/items");
            const nextEBELP = (items.length + 1) * 10;

            items.push({
                EBELP: nextEBELP,
                MATNR: "",
                MENGE: null,
                MEINS: "",
                WERKS: "",
                NETPR: null
            });

            // setProperty triggers binding refresh; direct push does not
            m.setProperty("/createPayload/items", items);
        },

        // ─────────────────────────────────────────────────────────────
        // READ — load PO headers and items into model
        // OData V4: results come back in { value: [...] }
        // callOData already unwraps this for you
        // ─────────────────────────────────────────────────────────────
        onLoadData: function () {
            const m = this.getView().getModel();

            callOData("/PurchaseOrders", "GET", null)
                .then(data => m.setProperty("/POHeader", data || []))
                .catch(err => MessageBox.error("Failed to load POs: " + err.message));

            callOData("/PurchaseOrderItems", "GET", null)
                .then(data => m.setProperty("/POItems", data || []))
                .catch(err => MessageBox.error("Failed to load PO Items: " + err.message));
        },

        // ─────────────────────────────────────────────────────────────
        // UPDATE — search by EBELP, load into edit form
        // ─────────────────────────────────────────────────────────────
        onSearchItem: function () {
            const m = this.getView().getModel();
            const ebelp = m.getProperty("/searchItemId");

            if (!ebelp) {
                MessageBox.warning("Please enter an Item Number (EBELP).");
                return;
            }

            // OData V4 key predicate — adjust entity set name if different
            callOData("/PurchaseOrderItems(" + ebelp + ")", "GET", null)
                .then(data => {
                    m.setProperty("/editItemPayload", data);
                    m.setProperty("/editItemMode", true);
                })
                .catch(() => MessageBox.error("Item not found for EBELP: " + ebelp));
        },

        onUpdateItem: function () {
            const m = this.getView().getModel();
            const data = m.getProperty("/editItemPayload");

            if (!data.MENGE) {
                MessageBox.warning("Quantity is required.");
                return;
            }

            // PATCH — only send the field being changed
            // OData V4 uses PATCH for partial updates, not PUT
            callOData("/PurchaseOrderItems(" + data.EBELP + ")", "PATCH", {
                MENGE: data.MENGE
            })
                .then(() => {
                    MessageBox.success("Item updated successfully.");
                    this.onBack();
                })
                .catch(err => MessageBox.error("Update failed: " + err.message));
        },

        onCancelItemEdit: function () {
            const m = this.getView().getModel();
            m.setProperty("/editItemMode", false);
            m.setProperty("/editItemPayload", {});
            m.setProperty("/searchItemId", "");
        },

        // ─────────────────────────────────────────────────────────────
        // Reset create form to initial state
        // ─────────────────────────────────────────────────────────────
        _resetCreatePayload: function () {
            this.getView().getModel().setProperty("/createPayload", {
                EBELN: "",
                BUKRS: "",
                BSART: "",
                LIFNR: "",
                AEDAT: "",
                ZTERM: "",
                currency: "",
                items: [{
                    EBELP: 10,
                    MATNR: "",
                    MENGE: null,
                    MEINS: "",
                    WERKS: "",
                    NETPR: null
                }]
            });
        }

    });
});
