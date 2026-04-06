def log_event(log, t, subject, station, status, waited=0, weight=None):
    entry = {"t": t, "sku": subject, "station": station, "status": status, "waited": waited}
    if weight is not None:
        entry["weight"] = weight
    log.append(entry)
