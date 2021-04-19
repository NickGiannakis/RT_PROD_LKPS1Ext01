sap.ui.define([
	"retail/store/productlookups1/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"retail/store/productlookups1/model/formatter",
	"retail/store/productlookups1/utils/DataCacheHandler",
	"retail/store/productlookups1/utils/Utilities",
	"retail/store/productlookups1/model/Facade",
	"retail/store/productlookups1/utils/Constants",
	"sap/m/Button",
	"sap/m/MessageBox",
	"sap/m/Text",
	"sap/m/LightBox",
	"sap/m/LightBoxItem",
	"sap/m/Label",
	"sap/m/MultiComboBox",
	"sap/ui/core/Item",
	"sap/ui/core/Fragment",
	"sap/ui/vbm/GeoMap"
], function(B, J, D, f, a, U, F, C, b, M, T, L, c, d, e, I, g, G) {
	"use strict";
	return sap.ui.controller("retail.store.productlookups1.RT_PROD_LKPS1Ext01.controller.ProductDetailsCustom", {
		_formatter: f,
		_utilities: U,
		_constants: C,
		_dataCacheHandler: a,
		_facade: F,
		_device: D,
		currentSiteId: null,
		currentArticleNumber: null,
		currentUoM: null,
		i18nBundle: {},
		_oBusyIndicator: null,
		_oCrossAppNav: null,
		_oEventBus: null,
		_oComponent: null,
		_jSONModel: J,
		_button: b,
		_messageBox: M,
		_text: T,
		_oPopover: null,
		_lightBox: L,
		_lightBoxItem: c,
		_label: d,
		_multiComboBox: e,
		_fragment: g,
		_item: I,
		oLightBox: null,
		_aCharacteristicMultiComboBoxes: null,
		_oCharacteristicItemTemplate: null,
		_bDisplayCollectionAsList: null,
		_iCharacteristicSelectionRequestCount: 0,
		_geoMap: G,
		_sNBSMapDataRequestTimer: null,
		_bUpdateList: false,
		_bIsMapEnabled: false,
		_fSearchRadiusInPreviousView: null,
		_oTabPressed: {
			Article: false,
			Promotions: false,
			BonusBuys: false,
			Deliveries: false,
			NearbyStores: false,
			Variants: false,
			Info5: false,
			Info6: false,
			Info7: false
		},

		MainBarcodeInd: function(sIn) {
			switch (sIn) {
				case "X":
					return "sap-icon://bookmark";
				default:
					return "";
			}
		},

		onInit: function() {
			var t = this;
			sap.ui.require("sap.ui.core.IconPool");
			this._oBusyIndicator = new sap.m.BusyDialog();
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oCrossAppNav = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService("CrossApplicationNavigation");
			this._oComponent = sap.ui.core.Component.getOwnerComponentFor(this.getView());
			this.i18nBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			var v = this._createViewModel();
			this.getRouter().getRoute("detail").attachPatternMatched(this.onRouteMatched, this);
			this.getRouter().getRoute("detail_noUoM").attachPatternMatched(this.onRouteMatched, this);
			this.setModel(v, "detailView");
			this._resetModels();
			this._bDisplayCollectionAsList = this._device.system.phone;
			this.setupPromotionSections();
			this.setupBonusBuySections();
			this.setupDeliverySections();
			this.setupNearbyStoresDisplayFragment();
			this.setupVariantsSection();
			this._configureGeoMap();
			this._oCameraBarcodeScannerButton = new sap.ndc.BarcodeScannerButton();
			this._oCameraBarcodeScannerButton.attachScanSuccess(jQuery.proxy(this.onCameraBarcodeScan, this));
			this.byId("CameraBarcodeScannerButton").setVisible(this.shouldDisplayScanButton());
			this._device.orientation.attachHandler(function(P) {
				t.byId("CameraBarcodeScannerButton").setVisible(t.shouldDisplayScanButton());
			});

			var z01 = function() {
				if (t.extHookTransferStockNavButtonParameters !== undefined && t.extHookTransferStockNavButtonParameters().fnDisabledNavigation !==
					undefined) {
					t.extHookTransferStockNavButtonParameters().fnDisabledNavigation();
				} else {
					var _werks = t.getView().getModel("Article").getProperty("/SiteID");
					var _matnr = t.getView().getModel("Article").getProperty("/ArticleNumber");
					if (t._oCrossAppNav) {
						t._oCrossAppNav.toExternal({
							target: {
								semanticObject: t.extHookTransferStockNavButtonParameters !== undefined ? t.extHookTransferStockNavButtonParameters().semanticObject : "Slipstream",
								action: t.extHookTransferStockNavButtonParameters !== undefined ? t.extHookTransferStockNavButtonParameters().action : "launch"
							},
							params: {
								transaction: "MD04",
								MATNR: _matnr,
								WERKS: _werks,
								flavor: "26CDFE77A0021ED993909ECDF540C10D"

							}
						}, t._oComponent);
					}
				}
			};

			if (this.extHookReplaceActionSheetButtons) {
				var h = this.extHookReplaceActionSheetButtons();
				var p = this.getView().byId("PRODUCTLOOKUP_DETAIL_PAGE");
				p.removeAllCustomShareMenuContent();
				h.forEach(function(o) {
					var j = new this._button(o["sId"], {
						text: o.sI18nBtnTxt,
						icon: o.sIcon,
						press: o.onBtnPressed
					});
					p.addCustomShareMenuContent(j);
				}, this);
			}
			var i = this.byId("PRODUCTLOOKUP_TAB_CONTAINER");
			i._stdSetSelectedKey = i.setSelectedKey;
			i.setSelectedKey = function(k) {
				this._stdSetSelectedKey(k);
				t.getDataForTab(k);
			};
		},
		//    onExit: function () {
		//        var t = this;
		//        this._device.orientation.detachHandler(function (p) {
		//            t.byId("CameraBarcodeScannerButton").setVisible(t.shouldDisplayScanButton());
		//        });
		//    },
		//    setupPromotionSections: function () {
		//        var t, o, p;
		//        if (this._bDisplayCollectionAsList) {
		//            t = new sap.ui.xmlfragment("PRODUCT_DETAILS_TODAY_PROMOTIONS_LIST", "retail.store.productlookups1.view.PromotionList", this);
		//            o = new sap.ui.xmlfragment("PRODUCT_DETAILS_FUTURE_PROMOTIONS_LIST", "retail.store.productlookups1.view.PromotionList", this);
		//            p = new sap.ui.xmlfragment("PRODUCT_DETAILS_PAST_PROMOTIONS_LIST", "retail.store.productlookups1.view.PromotionList", this);
		//        } else {
		//            t = new sap.ui.xmlfragment("PRODUCT_DETAILS_TODAY_PROMOTIONS_TABLE", "retail.store.productlookups1.view.PromotionTable", this);
		//            o = new sap.ui.xmlfragment("PRODUCT_DETAILS_FUTURE_PROMOTIONS_TABLE", "retail.store.productlookups1.view.PromotionTable", this);
		//            p = new sap.ui.xmlfragment("PRODUCT_DETAILS_PAST_PROMOTIONS_TABLE", "retail.store.productlookups1.view.PromotionTable", this);
		//        }
		//        var h = this.byId("PRODUCTLOOKUP_DETAIL_TODAY_PROMOTIONS");
		//        var i = this.byId("PRODUCTLOOKUP_DETAIL_FUTURE_PROMOTIONS");
		//        var P = this.byId("PRODUCTLOOKUP_DETAIL_PAST_PROMOTIONS");
		//        h.addContent(t);
		//        i.addContent(o);
		//        P.addContent(p);
		//        var j = this.getView().getModel("Promotions");
		//        t.setModel(j);
		//        o.setModel(j);
		//        p.setModel(j);
		//        t.getBindingInfo("items").path = "/Today";
		//        o.getBindingInfo("items").path = "/Future";
		//        p.getBindingInfo("items").path = "/Past";
		//    },
		//    setupBonusBuySections: function () {
		//        var t, o, p;
		//        if (this._bDisplayCollectionAsList) {
		//            t = new sap.ui.xmlfragment("PRODUCT_DETAILS_TODAY_BONUSBUY_LIST", "retail.store.productlookups1.view.BonusBuyList", this);
		//            o = new sap.ui.xmlfragment("PRODUCT_DETAILS_FUTURE_BONUSBUY_LIST", "retail.store.productlookups1.view.BonusBuyList", this);
		//            p = new sap.ui.xmlfragment("PRODUCT_DETAILS_PAST_BONUSBUY_LIST", "retail.store.productlookups1.view.BonusBuyList", this);
		//        } else {
		//            t = new sap.ui.xmlfragment("PRODUCT_DETAILS_TODAY_BONUSBUY_TABLE", this.extHookGetBBFragmentName ? this.extHookGetBBFragmentName() : "retail.store.productlookups1.view.BonusBuyTable", this);
		//            o = new sap.ui.xmlfragment("PRODUCT_DETAILS_FUTURE_BONUSBUY_TABLE", this.extHookGetBBFragmentName ? this.extHookGetBBFragmentName() : "retail.store.productlookups1.view.BonusBuyTable", this);
		//            p = new sap.ui.xmlfragment("PRODUCT_DETAILS_PAST_BONUSBUY_TABLE", this.extHookGetBBFragmentName ? this.extHookGetBBFragmentName() : "retail.store.productlookups1.view.BonusBuyTable", this);
		//        }
		//        var h = this.byId("PRODUCTLOOKUP_DETAIL_TODAY_BONUSBUYS");
		//        var i = this.byId("PRODUCTLOOKUP_DETAIL_FUTURE_BONUSBUYS");
		//        var P = this.byId("PRODUCTLOOKUP_DETAIL_PAST_BONUSBUYS");
		//        h.addContent(t);
		//        i.addContent(o);
		//        P.addContent(p);
		//        var j = this.getView().getModel("BonusBuys");
		//        t.setModel(j);
		//        o.setModel(j);
		//        p.setModel(j);
		//        t.getBindingInfo("items").path = "/Today";
		//        o.getBindingInfo("items").path = "/Future";
		//        p.getBindingInfo("items").path = "/Past";
		//    },
		//    setupDeliverySections: function () {
		//        var t, o, p;
		//        if (this._bDisplayCollectionAsList) {
		//            t = new sap.ui.xmlfragment("PRODUCT_DETAILS_TODAY_DELIVERIES_LIST", "retail.store.productlookups1.view.DeliveryList", this);
		//            o = new sap.ui.xmlfragment("PRODUCT_DETAILS_FUTURE_DELIVERIES_LIST", "retail.store.productlookups1.view.DeliveryList", this);
		//            p = new sap.ui.xmlfragment("PRODUCT_DETAILS_PAST_DELIVERIES_LIST", "retail.store.productlookups1.view.DeliveryList", this);
		//        } else {
		//            t = new sap.ui.xmlfragment("PRODUCT_DETAILS_TODAY_DELIVERIES_TABLE", "retail.store.productlookups1.view.DeliveryTable", this);
		//            o = new sap.ui.xmlfragment("PRODUCT_DETAILS_FUTURE_DELIVERIES_TABLE", "retail.store.productlookups1.view.DeliveryTable", this);
		//            p = new sap.ui.xmlfragment("PRODUCT_DETAILS_PAST_DELIVERIES_TABLE", "retail.store.productlookups1.view.DeliveryTable", this);
		//        }
		//        var h = this.byId("PRODUCTLOOKUP_DETAIL_TODAY_DELIVERIES");
		//        var i = this.byId("PRODUCTLOOKUP_DETAIL_FUTURE_DELIVERIES");
		//        var P = this.byId("PRODUCTLOOKUP_DETAIL_PAST_DELIVERIES");
		//        h.addContent(t);
		//        i.addContent(o);
		//        P.addContent(p);
		//        var j = this.getView().getModel("Deliveries");
		//        t.setModel(j);
		//        o.setModel(j);
		//        p.setModel(j);
		//        t.getBindingInfo("items").path = "/Today";
		//        o.getBindingInfo("items").path = "/Future";
		//        p.getBindingInfo("items").path = "/Past";
		//    },
		//    setupNearbyStoresDisplayFragment: function () {
		//        var n, N;
		//        N = new sap.ui.xmlfragment("PRODUCTLOOKUP_DETAILS_NEARBY_STORES_MAP_DISPLAY", "retail.store.productlookups1.view.NearbyStoresMap", this);
		//        if (this._bDisplayCollectionAsList) {
		//            n = new sap.ui.xmlfragment("PRODUCTLOOKUP_DETAILS_NEARBY_STORES_DISPLAY", "retail.store.productlookups1.view.NearbyStoresList", this);
		//        } else {
		//            n = new sap.ui.xmlfragment("PRODUCTLOOKUP_DETAILS_NEARBY_STORES_DISPLAY", "retail.store.productlookups1.view.NearbyStoresTable", this);
		//        }
		//        var o = this.byId("PRODUCTLOOKUP_DETAIL_TAB_NEARBY_STORES");
		//        o.addContent(n);
		//        o.addContent(N);
		//        var m = this.getMapHeight();
		//        this._fragment.byId("PRODUCTLOOKUP_DETAILS_NEARBY_STORES_MAP_DISPLAY", "PRODUCTLOOKUP_NEARBY_STORES_GEOMAP").setHeight(m);
		//    },
		//    setupVariantsSection: function () {
		//        var v;
		//        if (this._bDisplayCollectionAsList) {
		//            v = new sap.ui.xmlfragment("PRODUCTLOOKUP_DETAILS_ALTERNATIVEARTICLES_DISPLAY", "retail.store.productlookups1.view.VariantsList", this);
		//        } else {
		//            v = new sap.ui.xmlfragment("PRODUCTLOOKUP_DETAILS_ALTERNATIVEARTICLES_DISPLAY", "retail.store.productlookups1.view.VariantsTable", this);
		//        }
		//        v.setBusyIndicatorDelay(50);
		//        var V = this.byId("PRODUCTLOOKUP_DETAIL_TAB_ALTERNATIVEARTICLES");
		//        V.addContent(v);
		//    },
		onRouteMatched: function(E) {
			if (E.getParameter("name") === "detail" || E.getParameter("name") === "detail_noUoM") {
				this._resetTabPressed();
				this._resetPromotionPanelStatus();
				this._resetBonusBuyPanelStatus();
				this._resetDeliveryPanelStatus();
				this.setupCharacteristicsSelectionForm();
				this._clearAndPopulateGTINVBox([], this.byId("PRODUCTLOOKUP_DETAIL_TAB_INFORMAITON_GTINS_LIST"));
				if (this.currentArticleNumber !== decodeURIComponent(E.getParameter("arguments").articleNumber) || this.currentSiteId !==
					decodeURIComponent(E.getParameter("arguments").siteId)) {
					this._resetModels();
					this.destroyMapDetailWindow();
				}
				var t = this;
				this.getOwnerComponent().getComponentData().oMainController.oBarcodeScanHandler.registerScanHandling(function(s) {
					t.onScan(s);
				});
				this._dataCacheHandler.getDefaultProductImage(function(o) {
					t.getView().setModel(o, "Image");
				});
				this.currentSiteId = decodeURIComponent(E.getParameter("arguments").siteId);
				this.currentArticleNumber = decodeURIComponent(E.getParameter("arguments").articleNumber);
				this.currentUoM = E.getParameter("name") === "detail" && E.getParameter("arguments").UoM ? decodeURIComponent(E.getParameter(
					"arguments").UoM) : null;
				this._enableFeatures();
				var h = this.byId("PRODUCTLOOKUP_TAB_CONTAINER");
				h.setSelectedKey(this.getDefaultTabKey());
				if (!h.getExpanded()) {
					h.setExpanded(true);
				}
			}
		},
		//    getDefaultTabKey: function () {
		//        return "Article";
		//    },
		//    _resetTabPressed: function () {
		//        for (var k in this._oTabPressed) {
		//            this._oTabPressed[k] = false;
		//        }
		//    },
		//    _resetModels: function () {
		//        this.getView().setModel(new this._jSONModel(), "Article");
		//        var p = {
		//            "Today": null,
		//            "Future": null,
		//            "Past": null
		//        };
		//        var o = {
		//            "Today": null,
		//            "Future": null,
		//            "Past": null
		//        };
		//        var h = {
		//            "Today": null,
		//            "Future": null,
		//            "Past": null
		//        };
		//        var n = {
		//            CurrentStoreArticle: {},
		//            NBSArticlesForMap: [],
		//            NBSArticlesForListing: []
		//        };
		//        this.getView().setModel(new this._jSONModel(p), "Promotions");
		//        this.getView().setModel(new this._jSONModel(o), "BonusBuys");
		//        this.getView().setModel(new this._jSONModel(n), "NeighbourStoreArticles");
		//        this.getView().setModel(new this._jSONModel(h), "Deliveries");
		//        this.getView().setModel(new this._jSONModel(), "AlternativeArticles");
		//        this.getView().setModel(new this._jSONModel(), "AlternativeArticleCharacteristics");
		//        this.getView().setModel(new this._jSONModel(), "NeighbourStoreArticlePerVariant");
		//        var t = {
		//            "Promotions": null,
		//            "Deliveries": null,
		//            "AlternativeArticles": null
		//        };
		//        this.getView().setModel(new this._jSONModel(t), "TabCounts");
		//    },
		//    _resetPromotionPanelStatus: function () {
		//        this.byId("PRODUCTLOOKUP_DETAIL_TODAY_PROMOTIONS").setExpanded(true);
		//        this.byId("PRODUCTLOOKUP_DETAIL_FUTURE_PROMOTIONS").setExpanded(false);
		//        this.byId("PRODUCTLOOKUP_DETAIL_PAST_PROMOTIONS").setExpanded(false);
		//    },
		//    _resetBonusBuyPanelStatus: function () {
		//        this.byId("PRODUCTLOOKUP_DETAIL_TODAY_BONUSBUYS").setExpanded(true);
		//        this.byId("PRODUCTLOOKUP_DETAIL_FUTURE_BONUSBUYS").setExpanded(false);
		//        this.byId("PRODUCTLOOKUP_DETAIL_PAST_BONUSBUYS").setExpanded(false);
		//    },
		//    _resetDeliveryPanelStatus: function () {
		//        this.byId("PRODUCTLOOKUP_DETAIL_TODAY_DELIVERIES").setExpanded(true);
		//        this.byId("PRODUCTLOOKUP_DETAIL_FUTURE_DELIVERIES").setExpanded(false);
		//        this.byId("PRODUCTLOOKUP_DETAIL_PAST_DELIVERIES").setExpanded(false);
		//    },
		//    onNavToAdjustStock: function () {
		//        if (this.extHookAdjustStockNavButtonParameters !== undefined && this.extHookAdjustStockNavButtonParameters().fnDisabledNavigation !== undefined) {
		//            this.extHookAdjustStockNavButtonParameters().fnDisabledNavigation();
		//        } else {
		//            if (this._oCrossAppNav) {
		//                this._oCrossAppNav.toExternal({
		//                    target: {
		//                        semanticObject: this.extHookAdjustStockNavButtonParameters !== undefined ? this.extHookAdjustStockNavButtonParameters().semanticObject : "Article",
		//                        action: this.extHookAdjustStockNavButtonParameters !== undefined ? this.extHookAdjustStockNavButtonParameters().action : "correctStock"
		//                    },
		//                    params: { ProductID: this.currentArticleNumber }
		//                }, this._oComponent);
		//            }
		//        }
		//    },
		//    onNavToOrderProduct: function () {
		//        if (this.extHookOrderProductNavButtonParameters !== undefined && this.extHookOrderProductNavButtonParameters().fnDisabledNavigation !== undefined) {
		//            this.extHookOrderProductNavButtonParameters().fnDisabledNavigation();
		//        } else {
		//            if (this._oCrossAppNav) {
		//                this._oCrossAppNav.toExternal({
		//                    target: {
		//                        semanticObject: this.extHookOrderProductNavButtonParameters !== undefined ? this.extHookOrderProductNavButtonParameters().semanticObject : "Article",
		//                        action: this.extHookOrderProductNavButtonParameters !== undefined ? this.extHookOrderProductNavButtonParameters().action : "order"
		//                    },
		//                    params: {
		//                        StoreID: this.currentSiteId,
		//                        ProductID: this.currentArticleNumber
		//                    }
		//                }, this._oComponent);
		//            }
		//        }
		//    },
		//    onNavToTransferStock: function () {
		//        if (this.extHookTransferStockNavButtonParameters !== undefined && this.extHookTransferStockNavButtonParameters().fnDisabledNavigation !== undefined) {
		//            this.extHookTransferStockNavButtonParameters().fnDisabledNavigation();
		//        } else {
		//            if (this._oCrossAppNav) {
		//                this._oCrossAppNav.toExternal({
		//                    target: {
		//                        semanticObject: this.extHookTransferStockNavButtonParameters !== undefined ? this.extHookTransferStockNavButtonParameters().semanticObject : "Article",
		//                        action: this.extHookTransferStockNavButtonParameters !== undefined ? this.extHookTransferStockNavButtonParameters().action : "transferStock"
		//                    },
		//                    params: { ProductID: this.currentArticleNumber }
		//                }, this._oComponent);
		//            }
		//        }
		//    },
		//    onNavToPrintLabel: function () {
		//        if (this.extHookPrintLabelNavButtonParameters !== undefined && this.extHookPrintLabelNavButtonParameters().fnDisabledNavigation !== undefined) {
		//            this.extHookPrintLabelNavButtonParameters().fnDisabledNavigation();
		//        } else {
		//            var s = this._dataCacheHandler.getScannedBarcodeNumber();
		//            var h = this.getView().getModel("Article").getProperty("/Ean");
		//            if (this._oCrossAppNav) {
		//                this._oCrossAppNav.toExternal({
		//                    target: {
		//                        semanticObject: this.extHookPrintLabelNavButtonParameters !== undefined ? this.extHookPrintLabelNavButtonParameters().semanticObject : "Article",
		//                        action: this.extHookPrintLabelNavButtonParameters !== undefined ? this.extHookPrintLabelNavButtonParameters().action : "printLabels"
		//                    },
		//                    params: {
		//                        StoreID: this.currentSiteId,
		//                        GlobalTradeItemNumber: s ? s : h
		//                    }
		//                }, this._oComponent);
		//            }
		//        }
		//    },
		//    shouldDisplayScanButton: function () {
		//        var i = this._device.system.phone;
		//        var h = this._device.system.tablet;
		//        var j = this._utilities.isOrientationLandscape();
		//        return i || h && !j;
		//    },
		//    onCameraBarcodeScan: function (E) {
		//        var t = E.getParameter("text");
		//        var h = E.getParameter("cancelled");
		//        if (t && !h) {
		//            this.getOwnerComponent().getComponentData().oMainController.oBarcodeScanHandler.handleBarcodeScan(t);
		//        }
		//    },
		//    onScan: function (s) {
		//        if (this._device.system.phone) {
		//            this._getProductDetailsByBarcodeNumber(s);
		//            this._dataCacheHandler.setScannedBarcodeNumber(s);
		//        } else {
		//            this._oEventBus.publish("retail.store.productlookups1.OnScanCall", "BarcodeScanned", s);
		//        }
		//    },
		//    _getProductDetailsByBarcodeNumber: function (s) {
		//        this._oBusyIndicator.open();
		//        var t = this;
		//        var h = function () {
		//            t._oBusyIndicator.close();
		//        };
		//        var E = function () {
		//            t._messageBox.show(t.i18nBundle.getText("READ_ARTICLE_DETAILS_ERR_MSG"), t._messageBox.Icon.ERROR, t.i18nBundle.getText("ERROR_MESSAGEBOX_TITLE_HEADER"), [t._messageBox.Action.OK]);
		//            h();
		//        };
		//        var S = function (o) {
		//            if (o && o[0]) {
		//                h();
		//                var P = o[0];
		//                if (P !== undefined) {
		//                    t.getRouter().navTo("detail", {
		//                        siteId: t.currentSiteId ? encodeURIComponent(t.currentSiteId) : "",
		//                        articleNumber: P.ArticleNumber ? encodeURIComponent(P.ArticleNumber) : "",
		//                        UoM: P.UoM ? encodeURIComponent(P.UoM) : ""
		//                    }, true);
		//                } else {
		//                    t._messageBox.show(t.i18nBundle.getText("NODATA"), t._messageBox.Icon.ERROR, t.i18nBundle.getText("ERROR_MESSAGEBOX_TITLE_HEADER"), [t._messageBox.Action.OK]);
		//                }
		//            } else {
		//                E();
		//            }
		//        };
		//        var i = this._facade._createSearchFilterObject([
		//            "SiteID",
		//            "Ean"
		//        ], [
		//            this.currentSiteId,
		//            s
		//        ]);
		//        var p = { filters: i };
		//        this._facade.read("/Articles", p, S, E);
		//    },
		//    onIconPress: function (E) {
		//        if (this.getModel("Image").getData() && this.getModel("Image").getData().ProductImage && this.getModel("Image").getData().ProductImage !== this._constants.SAP_DEFAULT_PICTURE) {
		//            if (!this.oLightBox) {
		//                this.oLightBox = new this._lightBox("productDetailsLargeImgLB", { imageContent: new this._lightBoxItem({}) });
		//                this.getView().addDependent(this.oLightBox);
		//            } else {
		//                this.oLightBox.destroyImageContent();
		//                this.oLightBox.addImageContent(new this._lightBoxItem({}));
		//            }
		//            if (this.getModel("Article").getData().LargeImgURL) {
		//                this.oLightBox.getImageContent()[0].setImageSrc(this.getModel("Article").getData().LargeImgURL);
		//            } else {
		//                this.oLightBox.getImageContent()[0].setImageSrc(this.getModel("Image").getData().ProductImage);
		//            }
		//            this.oLightBox.getImageContent()[0].setTitle(this.getModel("Article").getData().Description);
		//            this.oLightBox.open();
		//        }
		//    },
		//    loadImage: function () {
		//        var p = this.currentArticleNumber;
		//        var h = this;
		//        this._dataCacheHandler.getProductImage(this.currentSiteId, p, function (i) {
		//            var j = h.currentArticleNumber;
		//            var _ = i.getData();
		//            var k = _.ProductNumber;
		//            if (k === undefined) {
		//                h.getView().setModel(i, "Image");
		//            } else if (j === k) {
		//                if (_.ProductImage && _.ProductImage.indexOf("data:image/png;base64,") < 0) {
		//                    _.ProductImage = "data:image/png;base64," + _.ProductImage;
		//                    i.setData(_);
		//                }
		//                h.getView().setModel(i, "Image");
		//            }
		//        });
		//    },
		//    openPopover: function (E) {
		//        var s = E.getSource();
		//        var p;
		//        if (!this._oPopover) {
		//            this._oPopover = new sap.ui.xmlfragment("PRODUCT_DETAILS_NEARBY_STORES_POPOVER", "retail.store.productlookups1.view.NearbyStoresPopover", this);
		//            this._oPopover.attachBeforeClose(this.beforePopoverClosed);
		//            this.getView().addDependent(this._oPopover);
		//            this._oPopover.aStoreList = this._fragment.byId("PRODUCT_DETAILS_NEARBY_STORES_POPOVER", "PRODUCTLOOKUP_ALTERNATIVEARTICLES_NEARBYSTORES_LIST");
		//            this._oPopover.aStoreList.setModel(new this._jSONModel([]), "PopoverNearbyStores");
		//            this._oPopover.aStoreList.setBusyIndicatorDelay(50);
		//        } else {
		//            this._oPopover.aStoreList.setModel(new this._jSONModel([]), "PopoverNearbyStores");
		//        }
		//        if (this._device.system.phone) {
		//            p = E.getSource().getMarkers && E.getSource().getMarkers().length > 0 ? E.getSource().getMarkers()[0] : E.getSource();
		//            this._oPopover.openBy(p);
		//        } else {
		//            p = E.getSource().getCells && E.getSource().getCells().length > 1 ? E.getSource().getCells()[1] : E.getSource();
		//            this._oPopover.openBy(p);
		//        }
		//        var i = typeof this.extHookReplaceInitialStoresShownInPopover === "function" ? this.extHookReplaceInitialStoresShownInPopover() : this._constants.DEFAULT_INITIAL_POPOVER_NEARBY_STORES_SHOWN;
		//        this._oPopover.aStoreList.setBusy(true);
		//        var A = this.getView().getModel("AlternativeArticles");
		//        var h = s.getBindingContextPath();
		//        var o = A.getProperty(h);
		//        var O = function (n) {
		//            var S = this._oPopover.aStoreList.getModel("PopoverNearbyStores");
		//            S.setData(n);
		//            if (S.getData()) {
		//                if (this.getModel("NeighbourStoreArticlePerVariant").getProperty("/" + o.AlternativeArticleNumber).length <= i) {
		//                    this._fragment.byId("PRODUCT_DETAILS_NEARBY_STORES_POPOVER", "displayMoreButton").setVisible(false);
		//                } else {
		//                    this._fragment.byId("PRODUCT_DETAILS_NEARBY_STORES_POPOVER", "displayMoreButton").setVisible(true);
		//                }
		//                this._oPopover.selectedAlternativeArticle = o;
		//                this._oPopover.aStoreList.setBusy(false);
		//            }
		//        }.bind(this);
		//        this.getNeighbourStoreArticleForVariant(o.AlternativeArticleNumber, i, O);
		//    },
		//    beforePopoverClosed: function (E) {
		//        E.getSource().selectedAlternativeArticle = null;
		//    },
		//    showFullList: function (E) {
		//        var o = function (n) {
		//            var s = this._oPopover.aStoreList.getModel("PopoverNearbyStores");
		//            s.setData(n);
		//            this._fragment.byId("PRODUCT_DETAILS_NEARBY_STORES_POPOVER", "displayMoreButton").setVisible(false);
		//            this._oPopover.focus();
		//        }.bind(this);
		//        this.getNeighbourStoreArticleForVariant(this._oPopover.selectedAlternativeArticle.AlternativeArticleNumber, undefined, o);
		//    },
		//    setupCharacteristicsSelectionForm: function () {
		//        if (!this._oCharacteristicItemTemplate) {
		//            this._oCharacteristicItemTemplate = new this._item({
		//                key: "{AlternativeArticleCharacteristics>CharacteristicValue}",
		//                text: "{AlternativeArticleCharacteristics>CharacteristicValueDesc}"
		//            });
		//        }
		//        var o = this.getView().byId("PRODUCTLOOKUP_VARIANTS_CHARACTERISTICS_SELECTION_FORM");
		//        this._aCharacteristicMultiComboBoxes = {};
		//        o.destroyContent();
		//        var h = this.getModel("AlternativeArticleCharacteristics");
		//        var i = h.getData();
		//        if (Array.isArray(i) && i.length > 0) {
		//            o.setVisible(true);
		//            i.forEach(function (j, k) {
		//                var l = new this._label({ text: j.Description });
		//                o.addContent(l);
		//                var m = new this._multiComboBox({
		//                    items: {
		//                        path: "AlternativeArticleCharacteristics>/" + k + "/Values",
		//                        template: this._oCharacteristicItemTemplate
		//                    },
		//                    selectionFinish: jQuery.proxy(this.onAlternativeArticleCharacteristicSelection, this)
		//                });
		//                m.setModel(h);
		//                this._aCharacteristicMultiComboBoxes[j.Name] = m;
		//                o.addContent(m);
		//            }, this);
		//        } else {
		//            o.setVisible(false);
		//        }
		//    },
		//    onAlternativeArticleCharacteristicSelection: function (E) {
		//        var s = this._bDisplayCollectionAsList ? "PRODUCTLOOKUP_LIST_ALTERNATIVEARTICLES" : "PRODUCTLOOKUP_ALTERNATIVEARTICLES_TABLE";
		//        var A = this._fragment.byId("PRODUCTLOOKUP_DETAILS_ALTERNATIVEARTICLES_DISPLAY", s);
		//        A.setBusy(true);
		//        var S = "";
		//        for (var h in this._aCharacteristicMultiComboBoxes) {
		//            if (this._aCharacteristicMultiComboBoxes.hasOwnProperty(h)) {
		//                var i = this._aCharacteristicMultiComboBoxes[h].getSelectedKeys();
		//                var j = i.reduce(function (k, l) {
		//                    return k.concat((k.length > 0 ? "|" : "") + h + "=" + l);
		//                }, "");
		//                S = S.concat((S.length > 0 ? "|" : "") + j);
		//            }
		//        }
		//        var o = function (k) {
		//            if (--this._iCharacteristicSelectionRequestCount <= 0) {
		//                this._setDetailCollectionModelFromResponseData(this.getView().getModel("AlternativeArticles"), A, k, this.i18nBundle.getText("MESSAGE_NO_DATA_VARIANTS"), this.i18nBundle.getText("READ_ALTERNATIVE_ARTICLES_ERR_MSG"));
		//                this._onDataRequestFinished(false);
		//                A.setBusy(false);
		//            }
		//            return k;
		//        }.bind(this);
		//        var O = function () {
		//            if (--this._iCharacteristicSelectionRequestCount <= 0) {
		//                this._onDataRequestFinished(true);
		//                A.setBusy(false);
		//            }
		//        };
		//        ++this._iCharacteristicSelectionRequestCount;
		//        this._facade.getAlternativeArticles(this.currentSiteId, this.currentArticleNumber, null, S, false, o, O);
		//    },
		//    getNeighbourStoreArticleForVariant: function (A, l, h) {
		//        var i = this.getModel("NeighbourStoreArticlePerVariant").getProperty("/" + A);
		//        var o = function (n) {
		//            h(l && l < n.length ? n.slice(0, l) : n);
		//        };
		//        if (i) {
		//            o(i);
		//        } else {
		//            var O = function (n) {
		//                if (!Array.isArray(n)) {
		//                    n = [];
		//                }
		//                n = n.filter(function (N) {
		//                    return N.NbSiteID !== this.currentSiteId && N.StockQuantity > 0;
		//                }.bind(this));
		//                this.getModel("NeighbourStoreArticlePerVariant").setProperty("/" + A, n);
		//                o(n);
		//            }.bind(this);
		//            var j = function () {
		//                this.getModel("NeighbourStoreArticlePerVariant").setProperty("/" + A, []);
		//                h([]);
		//            }.bind(this);
		//            this._facade.getNeighbourStoreArticles(this.currentSiteId, A, undefined, undefined, undefined, O, j);
		//        }
		//    },
		getDataForTab: function(t) {
			if (!this.currentUoM) {
				var s = function(A) {
					this.currentUoM = A && A.StockUnit;
					if (this.currentUoM) {
						this.getDataForTab(t);
					}
				}.bind(this);
				var E = function(l) {
					if (l.length > 0) {
						this._messageBox.show(l[0]._sErrorMessage, this._messageBox.Icon.ERROR, this.i18nBundle.getText("ERROR_MESSAGEBOX_TITLE_HEADER"), [
							this._messageBox.Action.OK
						]);
					}
				}.bind(this);
				this._facade.getProductsBySiteIdArticle(this.currentSiteId, this.currentArticleNumber, s, E);
			} else {
				var r = this.getRequestsForTab(t);
				if (r.length === 0) {
					return;
				}
				this._oBusyIndicator.open();
				var R = this.getRequestSuccessCallbacksForTab(t);
				var h = function(l) {
					this._onDataRequestFinished(l);
					this._oTabPressed[t] = this;
					this._oBusyIndicator.close();
				}.bind(this);
				var i = function(l) {
					if (l.length > 0) {
						this._messageBox.show(l[0]._sErrorMessage, this._messageBox.Icon.ERROR, this.i18nBundle.getText("ERROR_MESSAGEBOX_TITLE_HEADER"), [
							this._messageBox.Action.OK
						]);
					}
					h(true);
				}.bind(this);
				var j = function(l) {
					R.forEach(function(S, m) {
						S(l[m]);
					});
					h(false);
				}.bind(this);
				var k = function(l) {
					i(l);
				};
				this._facade.sendBatchRequests(r, null, j, k);
			}
		},
		//    _onDataRequestFinished: function (E) {
		//        if (this.extHookOnProductDetailsDataReceived) {
		//            this.extHookOnProductDetailsDataReceived(E);
		//        }
		//    },
		//    getRequestsForTab: function (t) {
		//        var r;
		//        r = this.getStandardRequestsForTab(t);
		//        if (t === this.getDefaultTabKey()) {
		//            var h = this.getCountRequests();
		//            if (h) {
		//                r = r.concat(h);
		//            }
		//        }
		//        var i = this.getCustomRequestsForTab(t);
		//        if (i) {
		//            r = r.concat(i);
		//        }
		//        return r;
		//    },
		//    getStandardRequestsForTab: function (t) {
		//        var s = [];
		//        switch (t) {
		//        case "Article":
		//            var A = this._facade.createArticleGetRequest(this.currentSiteId, this.currentArticleNumber, this.currentUoM);
		//            s.push(A);
		//            break;
		//        case "Promotions":
		//            var o = this._facade.createPromotionsGetRequest(this.currentSiteId, this.currentArticleNumber, this.currentUoM, this._constants.TODAY_PROMOTION_ACTION);
		//            s.push(o);
		//            break;
		//        case "BonusBuys":
		//            var h = this._facade.createBonusBuysGetRequest(this.currentSiteId, this.currentArticleNumber, this.currentUoM, this._constants.TODAY_BONUSBUY_ACTION);
		//            s.push(h);
		//            break;
		//        case "Deliveries":
		//            var i = this._facade.createDeliveriesGetRequest(this.currentSiteId, this.currentArticleNumber, this._constants.TODAY_DELIVERY_ACTION);
		//            s.push(i);
		//            break;
		//        case "NearbyStores":
		//            var n = this._facade.createNeighbourStoreArticlesGetRequest(this.currentSiteId, this.currentArticleNumber);
		//            s.push(n);
		//            break;
		//        case "Variants":
		//            var j = this._facade.createAlternativeArticlesGetRequest(this.currentSiteId, this.currentArticleNumber);
		//            var k = this._facade.createAlternativeArticleCharacteristicsGetRequest(this.currentSiteId, this.currentArticleNumber);
		//            s.push(j, k);
		//            break;
		//        default:
		//            break;
		//        }
		//        return s;
		//    },
		//    getCountRequests: function () {
		//        var h = true;
		//        var o = this._facade.createDeliveriesGetRequest(this.currentSiteId, this.currentArticleNumber, this._constants.TODAY_DELIVERY_ACTION, h);
		//        var A = this._facade.createAlternativeArticlesGetRequest(this.currentSiteId, this.currentArticleNumber, undefined, undefined, h);
		//        var i = [
		//            o,
		//            A
		//        ];
		//        return i;
		//    },
		//    getCustomRequestsForTab: function (t) {
		//        var h = [];
		//        var i = this.extHookCustomDataRequests && this.extHookCustomDataRequests().aQueries.length === this.extHookCustomDataRequests().aFnCallbacks.length;
		//        if (i) {
		//            var j = this.extHookCustomDataRequests && this.extHookCustomDataRequests().aTabKeys && this.extHookCustomDataRequests().aQueries.length === this.extHookCustomDataRequests().aTabKeys.length;
		//            if (j) {
		//                h = this.extHookCustomDataRequests().aQueries.filter(function (q, l) {
		//                    return this.extHookCustomDataRequests().aTabKeys[l] === t;
		//                }, this);
		//            } else {
		//                if (!this._oTabPressed[this.getDefaultTabKey()]) {
		//                    h = this.extHookCustomDataRequests().aQueries;
		//                }
		//            }
		//        }
		//        var k = h.map(function (q) {
		//            var p = {
		//                context: q.context,
		//                filters: q.aFilters,
		//                urlParameters: q.urlParameters
		//            };
		//            return this._facade.createBatchRequest(this._facade.READ_REQUEST_TYPE, q.path, null, p);
		//        }, this);
		//        return k;
		//    },
		//    getRequestSuccessCallbacksForTab: function (t) {
		//        var s;
		//        s = this.getStandardRequestSuccessCallbacksForTab(t);
		//        if (t === this.getDefaultTabKey()) {
		//            var h = this.getCountRequestCallbacks();
		//            if (h) {
		//                s = s.concat(h);
		//            }
		//        }
		//        var i = this.getCustomRequestSuccessCallbacksForTab(t);
		//        if (i) {
		//            s = s.concat(i);
		//        }
		//        return s;
		//    },
		//    getStandardRequestSuccessCallbacksForTab: function (t) {
		//        var s = [];
		//        switch (t) {
		//        case "Article":
		//            var o = function (A) {
		//                var m = A && A.length > 0 ? A[0] : null;
		//                if (m) {
		//                    var n = this.getView().getModel("Article");
		//                    m.aGTINs = this._utilities.parseArticleGTINsString(m.GTINsString);
		//                    var v = this.byId("PRODUCTLOOKUP_DETAIL_TAB_INFORMAITON_GTINS_LIST");
		//                    this._clearAndPopulateGTINVBox(m.aGTINs, v);
		//                    if (m.ThumbnailURL === undefined || m.ThumbnailURL === "") {
		//                        this.loadImage(m.ArticleNumber);
		//                    } else {
		//                        var p = new this._jSONModel();
		//                        p.setData({
		//                            "ProductNumber": m.ArticleNumber,
		//                            "ProductImage": m.ThumbnailURL
		//                        });
		//                        this.getView().setModel(p, "Image");
		//                    }
		//                    n.setData(m);
		//                }
		//                return m;
		//            }.bind(this);
		//            s.push(o);
		//            break;
		//        case "Promotions":
		//            var O = function (p) {
		//                this._utilities.adjustModelSizeLimit(this.getModel("Promotions"), p.length);
		//                this.getModel("Promotions").setProperty("/Today", p);
		//                return p;
		//            }.bind(this);
		//            s.push(O);
		//            break;
		//        case "BonusBuys":
		//            var h = function (m) {
		//                this._utilities.adjustModelSizeLimit(this.getModel("BonusBuys"), m.length);
		//                this.getModel("BonusBuys").setProperty("/Today", m);
		//                return m;
		//            }.bind(this);
		//            s.push(h);
		//            break;
		//        case "Deliveries":
		//            var i = function (m) {
		//                this._utilities.adjustModelSizeLimit(this.getModel("Deliveries"), m.length);
		//                this.getModel("Deliveries").setProperty("/Today", m);
		//                return m;
		//            }.bind(this);
		//            s.push(i);
		//            break;
		//        case "NearbyStores":
		//            var j = function (n) {
		//                var m = this.getView().getModel("NeighbourStoreArticles");
		//                n = this.filterNBSArticles(n);
		//                var N = jQuery.extend(true, [], n.filter(function (p) {
		//                    if (p.NbSiteID === this.currentSiteId) {
		//                        m.setProperty("/CurrentStoreArticle", p);
		//                        if (this.getOwnerComponent().getModel("geoMapConfig") == undefined)
		//                            m.getData().CurrentStoreArticle.MapEnabled = "";
		//                        this._bIsMapEnabled = m.getProperty("/CurrentStoreArticle").MapEnabled === "X";
		//                    }
		//                    return p.NbSiteID !== this.currentSiteId;
		//                }.bind(this)));
		//                m.setProperty("/NBSArticlesForListing", N);
		//                m.setProperty("/NBSArticlesForMap", n);
		//                this.initSearchRadiusSelect();
		//                m.updateBindings();
		//                if (this._bIsMapEnabled) {
		//                    if (this.byId("PRODUCTLOOKUP_NEARBYSTORE_MAP_LIST_SEGMENTED_BUTTON").getSelectedKey() !== "PRODUCTLOOKUP_NEARBYSTORE_MAP") {
		//                        this.byId("PRODUCTLOOKUP_NEARBYSTORE_MAP_LIST_SEGMENTED_BUTTON").setSelectedKey("PRODUCTLOOKUP_NEARBYSTORE_MAP");
		//                        this._fSearchRadiusInPreviousView = this.getSelectedSearchRadius();
		//                        this.toggleMapListDisplay(false);
		//                    }
		//                    this._delayInitialCenterAndZoom(this.getMapControl());
		//                }
		//                return n;
		//            }.bind(this);
		//            s.push(j);
		//            break;
		//        case "Variants":
		//            var k = function (A) {
		//                var m = this._bDisplayCollectionAsList ? "PRODUCTLOOKUP_LIST_ALTERNATIVEARTICLES" : "PRODUCTLOOKUP_ALTERNATIVEARTICLES_TABLE";
		//                this._setDetailCollectionModelFromResponseData(this.getView().getModel("AlternativeArticles"), this._fragment.byId("PRODUCTLOOKUP_DETAILS_ALTERNATIVEARTICLES_DISPLAY", m), A, this.i18nBundle.getText("MESSAGE_NO_DATA_VARIANTS"), this.i18nBundle.getText("READ_ALTERNATIVE_ARTICLES_ERR_MSG"));
		//                return A;
		//            }.bind(this);
		//            var l = function (A) {
		//                var m = A.reduce(function (n, p) {
		//                    var q;
		//                    var r = n.some(function (u) {
		//                        q = u;
		//                        return u.Name === p.CharacteristicName;
		//                    });
		//                    if (r) {
		//                        q.Values.push(p);
		//                    } else {
		//                        q = {
		//                            Name: p.CharacteristicName,
		//                            Description: p.CharacteristicDesc,
		//                            Values: [p]
		//                        };
		//                        n.push(q);
		//                    }
		//                    return n;
		//                }, []);
		//                this.getModel("AlternativeArticleCharacteristics").setData(m);
		//                this.setupCharacteristicsSelectionForm();
		//                return A;
		//            }.bind(this);
		//            s.push(k, l);
		//            break;
		//        default:
		//            break;
		//        }
		//        return s;
		//    },
		//    getCountRequestCallbacks: function () {
		//        var h = function (E) {
		//            return function (j) {
		//                this.setTabCount(E, j);
		//                var k = j === null || j === undefined;
		//                return k;
		//            }.bind(this);
		//        }.bind(this);
		//        var i = [
		//            h("Deliveries"),
		//            h("AlternativeArticles")
		//        ];
		//        return i;
		//    },
		//    getCustomRequestSuccessCallbacksForTab: function (t) {
		//        var h = [];
		//        var i = this.extHookCustomDataRequests && this.extHookCustomDataRequests().aQueries.length === this.extHookCustomDataRequests().aFnCallbacks.length;
		//        if (i) {
		//            var j = this.extHookCustomDataRequests && this.extHookCustomDataRequests().aTabKeys && this.extHookCustomDataRequests().aQueries.length === this.extHookCustomDataRequests().aTabKeys.length;
		//            if (j) {
		//                h = this.extHookCustomDataRequests().aFnCallbacks.filter(function (k, l) {
		//                    return this.extHookCustomDataRequests().aTabKeys[l] === t;
		//                }, this);
		//            } else {
		//                if (!this._oTabPressed[this.getDefaultTabKey()]) {
		//                    h = this.extHookCustomDataRequests().aFnCallbacks;
		//                }
		//            }
		//        }
		//        return h;
		//    },
		//    _setDetailCollectionModelFromResponseData: function (m, o, r, n, E) {
		//        o.setShowSeparators(sap.m.ListSeparators.None);
		//        if (r) {
		//            if (r.length > 0) {
		//                this._utilities.adjustModelSizeLimit(m, r.length);
		//                m.setData(r);
		//                o.setShowSeparators(sap.m.ListSeparators.All);
		//            } else {
		//                m.setData({});
		//            }
		//            o.setNoDataText(n);
		//        } else {
		//            m.setData({});
		//            var h = this._getErrorMessageFromPayloadBody(r);
		//            o.setNoDataText(h);
		//        }
		//    },
		//    _getErrorMessageFromPayloadBody: function (o) {
		//        var j = JSON.parse(o);
		//        return j.error.message.value;
		//    },
		//    _clearAndPopulateGTINVBox: function (h, v) {
		//        var t = this;
		//        v.destroyItems();
		//        if (Array.isArray(h) && h.length > 0) {
		//            h.forEach(function (i, j) {
		//                v.addItem(new t._text({
		//                    id: "PRODUCTLOOKUP_DETAIL_TAB_INFORMAITON_GTIN_TEXT_" + j,
		//                    text: i.gtin
		//                }));
		//            });
		//        }
		//    },
		//    setTabCount: function (E, t) {
		//        var o = this.getView().getModel("TabCounts");
		//        o.setProperty("/" + E, t);
		//    },
		//    getStoreProperty: function (E, p) {
		//        var s = this.getView().getModel("NeighbourStoreArticles");
		//        var h = E.getSource().getParent().getBindingContext();
		//        if (!h) {
		//            h = E.getSource().getParent().getBindingContext("NeighbourStoreArticles");
		//        }
		//        var i = h.getPath();
		//        var j = s.getProperty(i + p);
		//        return j;
		//    },
		//    _configureGeoMap: function () {
		//        var o = this.getOwnerComponent().getModel("geoMapConfig");
		//        if (o) {
		//            var h = this.getMapControl();
		//            var A = this._constants.GEO_MAP_CONFIG_APP_ID;
		//            o.read("/VBIApplicationSet('" + A + "')", {
		//                success: function (i) {
		//                    var m = JSON.parse(i.MapConfigJSON);
		//                    if (!m || !m.MapProvider) {
		//                        return;
		//                    }
		//                    var j = {
		//                        "MapProvider": m.MapProvider,
		//                        "MapLayerStacks": m.MapLayerStack
		//                    };
		//                    h.setMapConfiguration(j);
		//                    var s = "";
		//                    if (Array.isArray(j.MapLayerStacks)) {
		//                        s = j.MapLayerStacks.length > 0 ? j.MapLayerStacks[0].name : "";
		//                    } else if (j.MapLayerStacks) {
		//                        s = j.MapLayerStacks.name;
		//                    }
		//                    h.setRefMapLayerStack(s);
		//                }.bind(this)
		//            });
		//        }
		//    },
		//    initSearchRadiusSelect: function () {
		//        var m = this.getView().getModel("NeighbourStoreArticles").getData();
		//        var p = m.CurrentStoreArticle.DistanceFilters ? m.CurrentStoreArticle.DistanceFilters.split(",") : [];
		//        var s = this.getView().byId("PRODUCTLOOKUP_NEARBYSTORE_RANGE");
		//        s.setModel(new this._jSONModel(p), "SearchRadiuses");
		//        var S = s.getItems();
		//        s.setSelectedItem(S[0]);
		//    },
		//    _delayInitialCenterAndZoom: function (m, n) {
		//        n = n ? n : 1;
		//        if (n <= 5) {
		//            if (!m.isRendered()) {
		//                window.setTimeout(jQuery.proxy(this._delayInitialCenterAndZoom, this, m, ++n), this._constants.MAP_RENDERING_DELAY);
		//            } else {
		//                this.onRecenterMap();
		//                m.attachCenterChanged(this.onMapCenterOrZoomChanged, this);
		//            }
		//        } else {
		//            this._messageBox.show(this.i18nBundle.getText("UNABLE_TO_LOAD_MAP_ERR_MSG"), {
		//                icon: this._messageBox.Icon.ERROR,
		//                title: this.i18nBundle.getText("ERROR_MESSAGEBOX_TITLE_HEADER"),
		//                actions: [this._messageBox.Action.OK]
		//            });
		//        }
		//    },
		//    _delayedCallForUpdateNBSArticles: function () {
		//        clearTimeout(this._sNBSMapDataRequestTimer);
		//        this._sNBSMapDataRequestTimer = window.setTimeout(jQuery.proxy(this.updateNBSArticles, this), this._constants.MAP_USER_INTERACTION_DELAY);
		//    },
		//    updateNBSArticles: function () {
		//        var n;
		//        var N;
		//        var h = [];
		//        var l = this.getNBSArticleListingFragment();
		//        var m = this.getMapControl();
		//        var s = this.getSelectedSearchRadius();
		//        var o = this.getNBSMapCenterCoordinates();
		//        var i = function (E) {
		//            this._onDataRequestFinished(E);
		//            l.setBusy(false);
		//            m.setBusy(false);
		//        }.bind(this);
		//        var j = function (E) {
		//            if (E.length > 0) {
		//                this._messageBox.show(E[0]._sErrorMessage, this._messageBox.Icon.ERROR, this.i18nBundle.getText("ERROR_MESSAGEBOX_TITLE_HEADER"), [this._messageBox.Action.OK]);
		//            }
		//            var p = true;
		//            i(p);
		//        }.bind(this);
		//        var k = function (p) {
		//            var q = true;
		//            var r = 0;
		//            if (n) {
		//                this.loadNBSArticlesModelData(p[r], q);
		//                r++;
		//            }
		//            if (N) {
		//                this.loadNBSArticlesModelData(p[r], !q);
		//            }
		//            var E = false;
		//            i(E);
		//        }.bind(this);
		//        l.setBusy(true);
		//        m.setBusy(true);
		//        if (this._bUpdateList) {
		//            n = this._facade.createNeighbourStoreArticlesGetRequest(this.currentSiteId, this.currentArticleNumber, s);
		//            this._bUpdateList = false;
		//        }
		//        if (this._bIsMapEnabled) {
		//            N = this._facade.createNeighbourStoreArticlesGetRequest(this.currentSiteId, this.currentArticleNumber, s, o.longitude, o.latitude);
		//        }
		//        if (n) {
		//            h.push(n);
		//        }
		//        if (N) {
		//            h.push(N);
		//        }
		//        this._facade.sendBatchRequests(h, null, k, j);
		//    },
		//    filterNBSArticles: function (n) {
		//        n = n.filter(function (N) {
		//            return N.NbSiteID === this.currentSiteId || N.StockQuantity > 0;
		//        }.bind(this));
		//        return n;
		//    },
		//    loadNBSArticlesModelData: function (n, i) {
		//        var m = this.getView().getModel("NeighbourStoreArticles");
		//        n = this.filterNBSArticles(n);
		//        if (i) {
		//            var N = jQuery.extend(true, [], n.filter(function (o) {
		//                return o.NbSiteID !== this.currentSiteId;
		//            }.bind(this)));
		//            m.setProperty("/NBSArticlesForListing", N);
		//        } else {
		//            var h = false;
		//            h = n.some(function (o) {
		//                return o.NbSiteID === this.currentSiteId;
		//            }.bind(this));
		//            if (!h) {
		//                n.push(m.getData().CurrentStoreArticle);
		//            }
		//            m.setProperty("/NBSArticlesForMap", n);
		//        }
		//        m.updateBindings();
		//    },
		//    onMapListSegmentedButtonSelect: function (E) {
		//        this.toggleMapListDisplay(E.getParameter("key") === "PRODUCTLOOKUP_NEARBYSTORE_LIST");
		//    },
		//    onSearchRadiusSelection: function (E) {
		//        this._bUpdateList = true;
		//        if (this.getNBSArticleListingFragment().getVisible()) {
		//            this.updateNBSArticles();
		//        } else {
		//            this.zoomMapToSelectedSearchRadius();
		//        }
		//    },
		//    onMapCenterOrZoomChanged: function (E) {
		//        this._delayedCallForUpdateNBSArticles();
		//    },
		//    onRecenterMap: function (E) {
		//        if (this.isStoreAwayFromCenter()) {
		//            this.recenterMapOnCurrentSite();
		//            this.zoomMapToSelectedSearchRadius();
		//        }
		//    },
		//    onMapStoreSelected: function (E) {
		//        var s = this.getSpotDetailWindow();
		//        var S = E.getSource();
		//        var o = S.getBindingContext("NeighbourStoreArticles");
		//        var t = this.i18nBundle.getText("STORE_DETAIL_WINDOW_TITLE");
		//        s.setBindingContext(o);
		//        S.openDetailWindow(t, "0", "0");
		//    },
		//    onOpenDetail: function (E) {
		//        var s = this.getSpotDetailWindow();
		//        s.placeAt(E.getParameter("contentarea").id);
		//    },
		//    getMapControl: function () {
		//        return this._fragment.byId("PRODUCTLOOKUP_DETAILS_NEARBY_STORES_MAP_DISPLAY", "PRODUCTLOOKUP_NEARBY_STORES_GEOMAP");
		//    },
		//    getMapHeight: function () {
		//        var w = jQuery(window).height();
		//        return this._device.system.phone ? (w - this._constants.PHONE_HEADER_FOOTER_SIZE_IN_PIXEL) * this._constants.MAP_DETAILVIEW_ASPECT_RATIO_ON_PHONE : w * this._constants.MAP_DETAILVIEW_ASPECT_RATIO_ON_DESKTOP;
		//    },
		//    getNBSArticleListingFragment: function () {
		//        return this._fragment.byId("PRODUCTLOOKUP_DETAILS_NEARBY_STORES_DISPLAY", this._bDisplayCollectionAsList ? "PRODUCTLOOKUP_NEARBY_STORES_LIST" : "PRODUCTLOOKUP_NEARBY_STORES_TABLE");
		//    },
		//    getNBSMapCenterCoordinates: function () {
		//        var m = this.getMapControl();
		//        return {
		//            latitude: this.getCoordinateWithinRange(parseFloat(m.getCenterPosition().split(";")[1]).toFixed(12), this._constants.MAX_LATITUDE).toString(),
		//            longitude: this.getCoordinateWithinRange(parseFloat(m.getCenterPosition().split(";")[0]).toFixed(12), this._constants.MAX_LONGITUDE).toString()
		//        };
		//    },
		//    getSelectedSearchRadius: function () {
		//        var s = this.byId("PRODUCTLOOKUP_NEARBYSTORE_RANGE");
		//        var S = s.getItems().length > 0 ? s.getSelectedItem().getKey() : "0";
		//        return parseFloat(S);
		//    },
		//    getSpotDetailWindow: function () {
		//        var s = this._fragment.byId("GeoMapSpotDetailWindow", "PRODUCTLOOKUP_MAP_ITEM_NEIGHBOURSTOREARTICLES");
		//        if (!s) {
		//            s = new sap.ui.xmlfragment("GeoMapSpotDetailWindow", "retail.store.productlookups1.view.NearbyStoresGeoMapSpotDetails", this);
		//            s.setModel(this.getView().getModel("NeighbourStoreArticles"));
		//            this.getView().addDependent(s);
		//            this.getView().addDependent(this._fragment.byId("GeoMapSpotDetailWindow", "PRODUCTLOOKUP_MAP_ITEM_NEIGHBOURSTOREARTICLES"));
		//        }
		//        return s;
		//    },
		//    getDistanceUnit: function () {
		//        var o = this.getModel("NeighbourStoreArticles").getProperty("/CurrentStoreArticle");
		//        return o.DistanceUnit;
		//    },
		//    toggleMapListDisplay: function (s) {
		//        this.getNBSArticleListingFragment().setVisible(s);
		//        this._fragment.byId("PRODUCTLOOKUP_DETAILS_NEARBY_STORES_MAP_DISPLAY", "PRODUCTLOOKUP_NEARBY_STORES_GEOMAP").setVisible(!s);
		//        this.getView().byId("PRODUCTLOOKUP_NEARBYSTORE_RECENTER_MAP").setVisible(!s);
		//        if (!s) {
		//            if (this._fSearchRadiusInPreviousView !== this.getSelectedSearchRadius()) {
		//                window.setTimeout(jQuery.proxy(this.zoomMapToSelectedSearchRadius, this), this._constants.MAP_USER_INTERACTION_DELAY);
		//            }
		//        } else {
		//            this._fSearchRadiusInPreviousView = this.getSelectedSearchRadius();
		//        }
		//    },
		//    zoomMapToSelectedSearchRadius: function () {
		//        var m = this.getMapControl();
		//        var s = this.getSelectedSearchRadius();
		//        var z = this.getZoomFromSearchRadius(s * 2, m);
		//        m.setZoomlevel(z);
		//    },
		//    recenterMapOnCurrentSite: function () {
		//        var m = this.getMapControl();
		//        var o = this.getModel("NeighbourStoreArticles").getProperty("/CurrentStoreArticle");
		//        var s = (o.Longitude ? o.Longitude : "0") + ";" + (o.Latitude ? o.Latitude : "0");
		//        m.setCenterPosition(s);
		//    },
		//    getZoomFromSearchRadius: function (s, m) {
		//        var z;
		//        if (this.extHookCalculateZoomLevel) {
		//            z = this.extHookCalculateZoomLevel(s);
		//        } else {
		//            var h = function (i) {
		//                return i * 1000;
		//            };
		//            var E = this._constants.EARTH_RADIUS_AT_EQUATOR_IN_METERS * 2 * Math.PI / this._constants.DEFAULT_MAP_TILE_SIZE_IN_PIXELS;
		//            z = Math.floor(Math.log(E * Math.cos(this.getNBSMapCenterCoordinates().latitude * Math.PI / 180) * this.getNBSMapWidth(m) / h(s)) / Math.log(2));
		//        }
		//        return z;
		//    },
		//    getNBSMapWidth: function (o) {
		//        var t = this.getView().byId("PRODUCTLOOKUP_TAB_CONTAINER");
		//        return jQuery("#" + t.getId()).width();
		//    },
		//    getDistanceInMeter: function (h) {
		//        var i = 1;
		//        var s = this.getDistanceUnit();
		//        if (s === this._constants.DISTANCE_UNIT_KILOMETER) {
		//            i = this._constants.KILOMETER_EQUIVALENT_OF_METER;
		//        } else if (s === this._constants.DISTANCE_UNIT_MILE) {
		//            i = this._constants.MILE_EQUIVALENT_OF_METER;
		//        }
		//        return h * i;
		//    },
		//    destroyMapDetailWindow: function () {
		//        var m = this._fragment.byId("GeoMapSpotDetailWindow", "PRODUCTLOOKUP_MAP_ITEM_NEIGHBOURSTOREARTICLES");
		//        if (m) {
		//            m.destroy();
		//        }
		//    },
		//    getCoordinateWithinRange: function (m, i) {
		//        return this._utilities.mathModulo(parseFloat(m) + i, i * 2) - i;
		//    },
		//    isStoreAwayFromCenter: function () {
		//        var m = this.getNBSMapCenterCoordinates();
		//        var o = this.getModel("NeighbourStoreArticles").getProperty("/CurrentStoreArticle");
		//        return o.Latitude !== m.latitude || o.Longitude !== m.longitude;
		//    },
		//    _handlePhonePress: function (E) {
		//        var p = this.getStoreProperty(E, "/PhoneMain");
		//        sap.m.URLHelper.triggerTel(p);
		//    },
		//    _handleMobilePress: function (E) {
		//        var m = this.getStoreProperty(E, "/PhoneMobile");
		//        sap.m.URLHelper.triggerTel(m);
		//    },
		//    _handleEmailPress: function (E) {
		//        var h = this.getView().getModel("Article");
		//        var i = this.getStoreProperty(E, "/Email");
		//        var j = this.i18nBundle.getText("EMAIL_SUBJECT_LAYAWAY");
		//        var k = this.i18nBundle.getText("RESERVATION_MSG");
		//        k += "\n" + h.getProperty("/Description");
		//        k += "\n\n" + "GTIN:";
		//        k += "\n" + h.getProperty("/Ean");
		//        sap.m.URLHelper.triggerEmail(i, j, k);
		//    },
		//    onVariantDetailsPressed: function (E) {
		//        var h = this.getView().getModel("AlternativeArticles");
		//        this._otable = E.getSource().getParent();
		//        var s = h.getProperty(this._otable.getBindingContextPath());
		//        if (s && s.NotListed !== "X") {
		//            var A = {
		//                ArticleNumber: s.AlternativeArticleNumber,
		//                UoM: this.currentUoM
		//            };
		//            sap.ui.getCore().getEventBus().publish("retail.store.productlookups1.OnAlternativeArticleSelected", "OnAlternativeArticleSelected", A);
		//        }
		//    },
		onTabSelected: function(E) {
				var k = E.getParameter("key");
				if (!this._oTabPressed[k]) {
					this.getDataForTab(k);
				}
			}
			//    onShareEmailPress: function () {
			//        var v = this.getModel("detailView");
			//        sap.m.URLHelper.triggerEmail(null, v.getProperty("/shareSendEmailSubject"), v.getProperty("/shareSendEmailMessage"));
			//    },
			//    onShareInJamPress: function () {
			//        var v = this.getModel("detailView"), s = sap.ui.getCore().createComponent({
			//                name: "sap.collaboration.components.fiori.sharing.dialog",
			//                settings: {
			//                    object: {
			//                        id: location.href,
			//                        share: v.getProperty("/shareOnJamTitle")
			//                    }
			//                }
			//            });
			//        s.open();
			//    },
			//    onDetailCollectionPanelExpand: function (E) {
			//        if (!E.getParameter("expand")) {
			//            return;
			//        }
			//        var h = E.getSource().getContent().filter(function (t) {
			//            return t.getAggregation("items");
			//        }).map(function (t) {
			//            return t.getBindingInfo("items");
			//        });
			//        var o = h.length > 0 ? h[0] : null;
			//        var i = o && !o.binding.getModel().getObject(o.path);
			//        if (i) {
			//            var s = o.model.slice(0, o.model.length / 2).toUpperCase();
			//            var p = o.path.slice(1, o.path.length).toUpperCase();
			//            var j = Object.keys(this._constants).filter(function (t) {
			//                return t.indexOf(s) !== -1 && t.indexOf(p) !== -1;
			//            });
			//            if (j.length > 0) {
			//                var k = j[0];
			//                var l;
			//                var A;
			//                var m = false;
			//                var n = function (t) {
			//                    this._onDataRequestFinished(t);
			//                    this._oBusyIndicator.close();
			//                }.bind(this);
			//                var q = function (t) {
			//                    this._utilities.adjustModelSizeLimit(this.getModel(o.model), t.length);
			//                    this.getModel(o.model).setProperty(o.path, t);
			//                    n(false);
			//                }.bind(this);
			//                var r = function (t) {
			//                    if (t.length > 0) {
			//                        this._messageBox.show(t[0]._sErrorMessage, this._messageBox.Icon.ERROR, this.i18nBundle.getText("ERROR_MESSAGEBOX_TITLE_HEADER"), [this._messageBox.Action.OK]);
			//                    }
			//                    n(true);
			//                }.bind(this);
			//                switch (o.model) {
			//                case "Promotions":
			//                case "BonusBuys":
			//                    l = this._facade.getPromotions;
			//                    A = [
			//                        this.currentSiteId,
			//                        this.currentArticleNumber,
			//                        this.currentUoM,
			//                        this._constants[k],
			//                        m,
			//                        q,
			//                        r
			//                    ];
			//                    break;
			//                case "Deliveries":
			//                    l = this._facade.getDeliveries;
			//                    A = [
			//                        this.currentSiteId,
			//                        this.currentArticleNumber,
			//                        this._constants[k],
			//                        m,
			//                        q,
			//                        r
			//                    ];
			//                    break;
			//                default:
			//                    l = function () {
			//                    };
			//                    A = [];
			//                    break;
			//                }
			//                this._oBusyIndicator.open();
			//                l.apply(this._facade, A);
			//            }
			//        }
			//    },
			//    _createViewModel: function () {
			//        return new this._jSONModel({
			//            busy: false,
			//            delay: 0
			//        });
			//    },
			//    _onObjectMatched: function (E) {
			//        var o = E.getParameter("arguments").objectId;
			//        this.getModel().metadataLoaded().then(function () {
			//            var O = this.getModel().createKey("Articles", { ArticleNumber: o });
			//            this._bindView("/" + O);
			//        }.bind(this));
			//    },
			//    _bindView: function (o) {
			//        var v = this.getModel("detailView");
			//        v.setProperty("/busy", false);
			//        this.getView().bindElement({
			//            path: o,
			//            events: {
			//                change: this._onBindingChange.bind(this),
			//                dataRequested: function () {
			//                    v.setProperty("/busy", true);
			//                },
			//                dataReceived: function () {
			//                    v.setProperty("/busy", false);
			//                }
			//            }
			//        });
			//    },
			//    _onBindingChange: function () {
			//        var v = this.getView(), E = v.getElementBinding();
			//        if (!E.getBoundContext()) {
			//            this.getRouter().getTargets().display("detailObjectNotFound");
			//            this.getOwnerComponent().oListSelector.clearMasterListSelection();
			//            return;
			//        }
			//        var p = E.getPath(), r = this.getResourceBundle(), o = v.getModel().getObject(p), O = o.ArticleNumber, s = o.Description, V = this.getModel("detailView");
			//        this.getOwnerComponent().oListSelector.selectAListItem(p);
			//        V.setProperty("/saveAsTileTitle", r.getText("shareSaveTileAppTitle", [s]));
			//        V.setProperty("/shareOnJamTitle", s);
			//        V.setProperty("/shareSendEmailSubject", r.getText("shareSendEmailObjectSubject", [O]));
			//        V.setProperty("/shareSendEmailMessage", r.getText("shareSendEmailObjectMessage", [
			//            s,
			//            O,
			//            location.href
			//        ]));
			//    },
			//    _enableFeatures: function () {
			//        var h = function (E) {
			//            if (E) {
			//                this._messageBox.show(E[0]._sErrorMessage, this._messageBox.Icon.ERROR, this.i18nBundle.getText("ERROR_MESSAGEBOX_TITLE_HEADER"));
			//                this.byId("PRODUCTLOOKUP_DETAIL_TAB_NEARBY_STORES").setVisible(false);
			//                this.byId("PRODUCTLOOKUP_DETAIL_TAB_PROMOTIONS").setVisible(false);
			//                this.byId("PRODUCTLOOKUP_DETAIL_TAB_BONUSBUYS").setVisible(false);
			//                this._fragment.byId("PRODUCTLOOKUP_DETAILS_ALTERNATIVEARTICLES_DISPLAY", "PRODUCTLOOKUP_NEARBYSTORES_ICON").setVisible(false);
			//            }
			//        }.bind(this);
			//        this._dataCacheHandler.loadAssignedFeatures(function () {
			//            this._loadAssignedFeaturesSuccessCallback(this);
			//        }.bind(this), h);
			//    },
			//    _loadAssignedFeaturesSuccessCallback: function (o) {
			//        var i = this._dataCacheHandler.isPromotionFeatureEnabled();
			//        var h = this._dataCacheHandler.isNearbyStoreFeatureEnabled();
			//        this.byId("PRODUCTLOOKUP_DETAIL_TAB_NEARBY_STORES").setVisible(h);
			//        this.byId("PRODUCTLOOKUP_DETAIL_TAB_PROMOTIONS").setVisible(i);
			//        this.byId("PRODUCTLOOKUP_DETAIL_TAB_BONUSBUYS").setVisible(i);
			//        this._fragment.byId("PRODUCTLOOKUP_DETAILS_ALTERNATIVEARTICLES_DISPLAY", "PRODUCTLOOKUP_NEARBYSTORES_ICON").setVisible(h);
			//        if (h === true) {
			//            this._fragment.byId("PRODUCTLOOKUP_DETAILS_ALTERNATIVEARTICLES_DISPLAY", "PRODUCTLOOKUP_ALTERNATIVEARTICLES_LIST").attachPress(this.openPopover, this);
			//            this._fragment.byId("PRODUCTLOOKUP_DETAILS_ALTERNATIVEARTICLES_DISPLAY", "PRODUCTLOOKUP_ALTERNATIVEARTICLES_LIST").setType("Active");
			//        }
			//    }
	});
});