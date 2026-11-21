CREATE TABLE meter_slot (
  plant TEXT NOT NULL, tag TEXT NOT NULL, slot INTEGER NOT NULL,
  event_key TEXT, status TEXT, raw REAL, delta REAL, unit TEXT, factor REAL,
  running INTEGER NOT NULL, silver INTEGER NOT NULL, gold INTEGER NOT NULL,
  rest INTEGER NOT NULL, overdue INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (plant,tag,slot)
);
--> statement-breakpoint
CREATE TABLE dq_alert (
  plant TEXT NOT NULL, tag TEXT NOT NULL, slot INTEGER NOT NULL,
  rule TEXT NOT NULL, version TEXT NOT NULL, triggered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plant,tag,slot,rule,version)
);
--> statement-breakpoint
CREATE TRIGGER assess_meter_slot AFTER INSERT ON meter_slot BEGIN
  INSERT INTO dq_alert(plant,tag,slot,rule,version)
  SELECT NEW.plant, NEW.tag, NEW.slot, value, 'demo_v1' FROM json_each(json_array(
    CASE WHEN NEW.status='positive_spike_ignored' THEN 'SPIKE' END,
    CASE WHEN NEW.status='low_reading_ignored' THEN 'LOW' END,
    CASE WHEN NEW.silver=1 AND NEW.gold=0 THEN 'GOLD_MISSING' END,
    CASE WHEN NEW.running=1 AND NEW.delta IS NOT NULL AND NEW.factor IS NULL THEN 'FACTOR' END,
    CASE WHEN NEW.rest=1 AND NEW.unit='kWh' AND NEW.delta>2 THEN 'REST' END,
    CASE WHEN NEW.silver=1 AND trim(coalesce(NEW.unit,''))='' THEN 'UNIT' END,
    CASE WHEN NEW.silver=1 AND NEW.raw IS NULL THEN 'VALUE' END,
    CASE WHEN NEW.silver=0 AND NEW.overdue=1 AND coalesce(NEW.status,'')<>'approved_override' THEN 'NO_READING' END
  )) WHERE value IS NOT NULL;
END;
