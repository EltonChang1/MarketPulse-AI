function formatNumber(value) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function MarketSummaryStrip({ items = [] }) {
  return (
    <section className="market-summary-strip" aria-label="Market summary">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="market-summary-item"
          onClick={() => item.onClick?.()}
          disabled={!item.onClick}
        >
          <div className="market-summary-label">{item.label}</div>
          <div className="market-summary-symbol">{item.symbol || "-"}</div>
          <div className="market-summary-price">{formatPrice(item.price)}</div>
          <div
            className={`market-summary-change ${
              Number(item.changePercent || 0) >= 0 ? "positive" : "negative"
            }`}
          >
            {formatPercent(Number(item.changePercent || 0))}
          </div>
          <div className="market-summary-volume">Vol {formatNumber(item.volume || 0)}</div>
        </button>
      ))}
    </section>
  );
}
