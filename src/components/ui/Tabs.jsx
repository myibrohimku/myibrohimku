import './Tabs.css';

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={`tabs__item ${active === tab.value ? 'tabs__item--active' : ''}`}
          onClick={() => onChange(tab.value)}
          role="tab"
          aria-selected={active === tab.value}
          type="button"
        >
          {tab.icon && <tab.icon size={16} />}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span className="tabs__count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
