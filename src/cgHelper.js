/**
 * Team Name:   Quasar
 * Description: Helper for Comparison Guru
 * 
 * Change History:  Apr 12, 2017    - Created 
 */

'use strict';

function CGDataHelper() {
}

/**
 * Extract the store name 
 * @param {*} store 
 */
CGDataHelper.prototype.getStoreName = function(store) {
    var storeName = "general";
    var storeNames = ["amazon", "bestbuy", "ebay", "walmart"];
    
    for (var i = 0; i < storeNames.length; i++) {
        if (store == storeNames[i]) {
            return storeNames[i];
        } else if (store == "best buy") {
            return "bestbuy";
        }
    }
    return storeName;
}

/**
 * Extract the product name and store if applicable
 * @param text - 
 */
CGDataHelper.prototype.getProductToSearch = function(text) {
    // Array to be returned
    var productInfo = {name: "", store: ""};
    
    // Split the "price of ", " in ", and store name
    var productToSearch = text.toLowerCase().split(" in");

    // Split the "price of " from the product name
    if (productToSearch[0].startsWith("price of")) {
        var productName = productToSearch[0].split("price of ");
        if (productName.length > 1) {
            productInfo.name = productName[1];

            // Save the name of the store
            if (productToSearch.length >= 2) {
                productInfo.store = this.getStoreName(productToSearch[1].trim());
            } else {
                productInfo.store = this.getStoreName("");
            }
        }
    }

    return productInfo;
}

module.exports = CGDataHelper;
