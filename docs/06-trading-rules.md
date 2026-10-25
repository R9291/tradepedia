# TRADEPEDIA — Trading Engine & Risk Rules

## 1. Pricing Mechanics
1. **Spread Application**:
   - $\text{Ask} = \text{Mid} + (\text{Spread} / 2)$
   - $\text{Bid} = \text{Mid} - (\text{Spread} / 2)$
2. **Order Execution**:
   - **BUY Orders**: Open at current **Ask**; Close at current **Bid**.
   - **SELL Orders**: Open at current **Bid**; Close at current **Ask**.

## 2. Profit and Loss Calculations
All calculations utilize Decimal arithmetic to preserve exact currency subunits:

- **BUY Position**:
  $$\text{PnL} = (\text{Exit Price} - \text{Entry Price}) \times \text{Contract Size} \times \text{Lot Size}$$
- **SELL Position**:
  $$\text{PnL} = (\text{Entry Price} - \text{Exit Price}) \times \text{Contract Size} \times \text{Lot Size}$$

*Example*:
- EUR/USD Buy, Lot Size: 0.10, Contract Size: 100,000 EUR
- Entry Ask: 1.08500
- Exit Bid: 1.08900
- $\Delta\text{Price} = 0.00400$
- $\text{PnL} = 0.00400 \times 100,000 \times 0.10 = +40.00 \text{ USD}$ (converted to KES at current live rate).

## 3. Margin & Leverage
- **Required Margin Formula**:
  $$\text{Margin Required} = \frac{\text{Contract Size} \times \text{Lot Size} \times \text{Entry Price}}{\text{Max Leverage}}$$
- **Account State Metrics**:
  - $\text{Equity} = \text{Available Balance} + \text{Locked Margin} + \sum(\text{Unrealized PnL})$
  - $\text{Free Margin} = \text{Equity} - \text{Locked Margin}$
  - $\text{Margin Level} = \left(\frac{\text{Equity}}{\text{Locked Margin}}\right) \times 100\%$

## 4. Risk Controls & Circuit Breakers
1. **Minimum Deposit**: Configured at KES 500.00.
2. **Maximum Open Positions**: Capped at 5 open trades per user.
3. **Daily Loss Limit**: Configured at 20% of user starting day balance. Once breached, trade opening is blocked for 24 hours.
4. **Margin Call Level (80% utilization)**: User receives warning banner in UI.
5. **Stop Out / Forced Liquidation (100% margin utilization)**: The engine automatically initiates liquidation of the highest losing trade to protect negative balance protection.
6. **Negative Balance Protection**: Trades will not push user available balance below zero.
