"""
SmartPark AI - Machine Learning Anomaly & Fraud Detection Engine
Evaluates booking velocity, cancellation ratios, account age, and unusual reservation amounts.
"""
import json

class SmartParkFraudDetector:
    def __init__(self):
        self.risk_threshold_medium = 30
        self.risk_threshold_high = 50
        self.risk_threshold_critical = 75

    def evaluate_risk(self, booking_context: dict) -> dict:
        """
        Calculates risk score (0-100) and risk level for a parking reservation request.
        """
        score = 10  # Baseline safe score
        reasons = []

        # 1. Booking Velocity Check
        recent_bookings_30m = booking_context.get("recent_bookings_30m", 0)
        if recent_bookings_30m >= 3:
            score += 45
            reasons.append(f"Rapid Multi-Booking Spike: {recent_bookings_30m} reservations within 30 minutes")
        elif recent_bookings_30m >= 2:
            score += 20
            reasons.append(f"Elevated velocity: {recent_bookings_30m} recent reservations")

        # 2. Historical Cancellation Rate
        prior_bookings = booking_context.get("prior_total_bookings", 0)
        prior_cancellations = booking_context.get("prior_cancellations", 0)
        if prior_bookings >= 4:
            cancel_ratio = prior_cancellations / prior_bookings
            if cancel_ratio > 0.60:
                score += 35
                reasons.append(f"Abnormal cancellation profile: {int(cancel_ratio * 100)}% cancel rate")

        # 3. New Account + High Value Booking
        account_age_hours = booking_context.get("account_age_hours", 24)
        booking_amount = booking_context.get("booking_amount", 50)
        if account_age_hours < 2 and booking_amount > 500:
            score += 25
            reasons.append(f"New account high-value anomaly: Account age {account_age_hours}h, Amount ₹{booking_amount}")

        # 4. Vehicle Capacity Mismatch
        vehicle_type = booking_context.get("vehicle_type", "car")
        slot_type = booking_context.get("slot_type", "normal")
        if vehicle_type == "bike" and slot_type == "vip":
            score += 15
            reasons.append("Slot category / Vehicle type mismatch flag")

        score = min(100, max(0, score))

        if score >= self.risk_threshold_critical:
            level = "CRITICAL"
        elif score >= self.risk_threshold_high:
            level = "HIGH"
        elif score >= self.risk_threshold_medium:
            level = "MEDIUM"
        else:
            level = "LOW"

        return {
            "risk_score": score,
            "risk_level": level,
            "is_flagged": score >= self.risk_threshold_high,
            "is_blocked": score >= self.risk_threshold_critical,
            "reasons": reasons if reasons else ["Clean transaction profile"],
            "decision": "REJECT" if score >= self.risk_threshold_critical else ("CHALLENGE" if score >= self.risk_threshold_high else "APPROVE")
        }

if __name__ == "__main__":
    detector = SmartParkFraudDetector()
    test_case = {
        "recent_bookings_30m": 3,
        "prior_total_bookings": 6,
        "prior_cancellations": 4,
        "account_age_hours": 1,
        "booking_amount": 650,
        "vehicle_type": "car",
        "slot_type": "ev"
    }
    result = detector.evaluate_risk(test_case)
    print(f"Fraud Evaluation Test: {json.dumps(result, indent=2)}")
