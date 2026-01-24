const calculateCartTotals = (cart) => {
    let subTotal = 0;
    let count = 0;

    // Filter null items
    cart.items = cart.items.filter(item => item.productId != null);

    cart.items.forEach(item => {
        subTotal += item.productId.price * item.quantity;
        count += item.quantity;
    });

    const tax = +(subTotal * 0.04).toFixed(2);
    const shipping = subTotal >= 100 ? 0 : 100;
    const total = +(subTotal + tax + shipping).toFixed(2);

    cart.subTotal = subTotal;
    cart.tax = tax;
    cart.shipping = shipping;
    cart.total = total;
    
    // Return count if needed for response
    return { subTotal, tax, shipping, total, count };
};

module.exports = { calculateCartTotals };
