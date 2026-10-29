# Fire-risk validation report

## Summary
This backtest compares wildfire risk in dry, forest-edge conditions against wetter monsoon conditions using the Canadian Forest Fire Weather Index logic and weather dryness proxies used in the ClimateGuard backend.

## Seasonal backtest
- Nainital / Uttarakhand (April-May): elevated temperature, low RH, dry wind, and low recent rain produce substantially higher FWI than monsoon periods. The model consistently assigns a higher fire-risk band during the drier pre-monsoon window.
- Maharashtra forest area (March): warm, dry, and windy conditions yield a higher FWI than the monsoon period, indicating a stronger fire spread signal under seasonal dryness.

## Interpretation
The FWI class rises materially when 24 h rain is low and temperature / VPD / wind increase. In the backtest, the dry-season pattern is consistently more severe than the wet-season pattern. This supports the use of weather-driven FWI plus observed fire pressure from FIRMS when a valid API key is configured.

## Acceptance note
The engine is designed to produce a higher FWI class in dry-season forest-fire windows, and to downgrade when monsoon rainfall and humidity reduce fuel dryness and spread potential.
