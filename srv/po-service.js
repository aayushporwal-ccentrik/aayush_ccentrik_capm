const cds = require('@sap/cds')

module.exports = cds.service.impl(async function() {

    //Initializing PurchaseOrders and Number Ranges
    const { PurchaseOrders, NumberRanges } = this.entities 

        this.before('SAVE', PurchaseOrders, async (req) => {

        // 1. Validation
        if (!req.data.items || req.data.items.length === 0) {
            return req.error(400, 'At least 1 line item is required')
        }

        // 2. Skip if number already exists (Prevent overwrite on Edit)
        if (req.data.EBELN) {
            console.log('>>> PO has already a number skipping generation')
         }
    }) 


    this.before('CREATE', PurchaseOrders, async (req) => {
        console.log(">>> NEW event triggered for PurchaseOrders");

        // Check if NumberRanges actually loaded
        if (!NumberRanges) {
            console.log(">>> Error: Entity NumberRanges not found in service definition");
        }

//        Query the database to find ONE record specifically for 'PurchaseOrder' types
//  forUpdate()' locks this row so two users don't get the same number at the exact same millisecond
        // const range = await SELECT.one.from(NumberRanges)
                //                 .where({ type: 'PurchaseOrders' })
                        //                 .forUpdate();
                const range = await SELECT.one.from(NumberRanges)
                        .where({ type: 'PurchaseOrders' })
                        .forUpdate();
    // Code to automatically update the PONumber if it doesn't exist   
        let nextValue = 1

        if (range) {
            nextValue = range.currentValue + 1
            // save the new number back to the DB!
            await UPDATE(NumberRanges)
                  .set({ currentValue: nextValue })
                  .where({ type: 'PurchaseOrders' })
        } else {
            // First time setup
            await INSERT.into(NumberRanges).entries({ type: 'PurchaseOrders', currentValue: 1 })
        }

        //  Enrichment: Assign the number to the record being saved
        req.data.EBELN = `PO-${nextValue.toString().padStart(4, '0')}`
        console.log(">>> Assigned EBELN:", req.data.EBELN);
    }) // <--- Added missing closing brace for 'NEW' handler



    this.on('submitPO', async (req) => {
        const { poID } = req.data
        return `PO ${ poID } submitted successfully`
    })

    this.after('READ', PurchaseOrders, (each) => {
        const elements = Array.isArray(each) ? each : [each]
        elements.forEach(po => {
            if (po.status === 'DRAFT') po.status = 'Approval Pending'
        })
    })
})

