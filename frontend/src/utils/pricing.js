function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function PriceBlock({ p }) {
  const hasDiscount = !!(p?.hasDiscount ?? p?.has_discount);
  const finalPrice = p?.finalPrice ?? p?.final_price;
  const discountAmount = p?.discountAmount ?? p?.discount_amount;

  if (hasDiscount && finalPrice != null) {
    return (
      <div className="space-y-0.5">
        <div className="text-lg font-semibold text-blue-700">৳{money(finalPrice)}</div>

        <div className="text-sm text-gray-600">
          <span className="line-through">৳{money(p?.price)}</span>
          {discountAmount != null && (
            <span className="ml-2 text-emerald-700 font-medium">
              Save ৳{money(discountAmount)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return <div className="text-lg font-semibold text-blue-700">৳{money(p?.price)}</div>;
}
