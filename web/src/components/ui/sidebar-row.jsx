export function SidebarRow({
  primaryText,
  secondaryText,
  rightPrimaryText,
  rightSecondaryText,
  rightSecondaryClassName = "",
  onRowClick,
  rowTitle,
  actionLabel,
  actionTitle,
  actionAriaLabel,
  onActionClick,
  actionVariant = "neutral",
}) {
  return (
    <div className="sidebar-row">
      <button
        className="sidebar-row-btn"
        onClick={onRowClick}
        title={rowTitle}
        type="button"
      >
        <div className="sidebar-row-left">
          <div className="sidebar-row-primary">{primaryText}</div>
          {secondaryText ? <div className="sidebar-row-secondary">{secondaryText}</div> : null}
        </div>
        {(rightPrimaryText || rightSecondaryText) && (
          <div className="sidebar-row-right">
            {rightPrimaryText ? <div className="sidebar-row-right-primary">{rightPrimaryText}</div> : null}
            {rightSecondaryText ? (
              <div className={`sidebar-row-right-secondary ${rightSecondaryClassName}`.trim()}>
                {rightSecondaryText}
              </div>
            ) : null}
          </div>
        )}
      </button>
      {actionLabel ? (
        <button
          className={`sidebar-row-action sidebar-row-action-${actionVariant}`}
          onClick={onActionClick}
          title={actionTitle}
          aria-label={actionAriaLabel}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
