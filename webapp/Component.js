jQuery.sap.declare("retail.store.productlookups1.RT_PROD_LKPS1Ext01.Component");

// use the load function for getting the optimized preload file if present
sap.ui.component.load({
	name: "retail.store.productlookups1",
	// Use the below URL to run the extended application when SAP-delivered application is deployed on SAPUI5 ABAP Repository
	url: "/sap/bc/ui5_ui5/sap/RT_PROD_LKPS1"
		// we use a URL relative to our own component
		// extension application is deployed with customer namespace
});

this.retail.store.productlookups1.Component.extend("retail.store.productlookups1.RT_PROD_LKPS1Ext01.Component", {
	metadata: {
		manifest: "json"
	}
});