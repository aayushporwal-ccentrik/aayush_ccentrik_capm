//Importing Data Model
using com.project.po as po from '../db/ZPO_AP_2803';

service POService @(path: '/po') {

    // 1. Added @odata.draft.enabled to support the Fiori "Create" flow
    // 2. Added @readonly to EBELN so it shows up but can't be changed by the user
    @odata.draft.enabled

    entity PurchaseOrders as projection on po.PurchaseOrder;

    entity PurchaseOrderItems as projection on po.PurchaseOrderItem;


    //Defining the contract for logic but not logic itself
    // CHANGE: Use technical name LIFNR for consistency if this refers to the vendor field
    function getTotalbyVendor(LIFNR : String) returns Decimal;
}


// Extending the contract via Custom action
extend service POService {
    action submitPO(poID : UUID) returns String;
}