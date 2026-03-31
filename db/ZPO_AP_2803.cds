namespace com.project.po;

using { managed, cuid } from '@sap/cds/common' ;

//Creation of PO_Header entity --> Parent entity
entity PurchaseOrder: managed, cuid {

    @title: 'poNumber'
        EBELN : String(10) not null;

            @title: 'companyCode'
                BUKRS : String(4);

                    @title: 'poType'
                        BSART : String(4);

                            @title: 'vendor'
                                @mandatory
                                    LIFNR : String(10);

                                        @title: 'orderDate'
                                            AEDAT : Date;

                                                @title: 'paymentTerms'
                                                    ZTERM : String(4);

                                                        @title: 'totalAmount'
                                                            totalAmount : Decimal(13,2);
                                                                
                                                                    @title: 'currency'
                                                                        currency : String(3);

                                                                            @title: 'status'
                                                                                STATU : String(20) default 'DRAFT';

                                                                                    // Composition (Header → Items)
                                                                                        items : Composition of many PurchaseOrderItem on items.up_ = $self;
                                                                                        }

                                                                                        //Creation of PO_Items entity --> Child entity
                                                                                        entity PurchaseOrderItem : cuid, managed {

                                                                                            up_ : Association to PurchaseOrder;

                                                                                                @title: 'lineItem'
                                                                                                    EBELP : Integer;

                                                                                                        @title: 'material'
                                                                                                            MATNR : String(40);

                                                                                                                @title: 'materialGroup'
                                                                                                                    MATKL : String(9);

                                                                                                                        @title: 'plant'
                                                                                                                            WERKS : String(4);

                                                                                                                                @title: 'storageLocation'
                                                                                                                                    LGORT : String(4);

                                                                                                                                        @title: 'quantity'
                                                                                                                                            MENGE : Decimal(13,3);

                                                                                                                                                @title: 'uom'
                                                                                                                                                    MEINS : String(3);

                                                                                                                                                        @title: 'unitPrice'
                                                                                                                                                            NETPR : Decimal(13,2);

                                                                                                                                                                @title: 'priceUnit'
                                                                                                                                                                    PEINH : Integer;
                                                                                                                                                                    };