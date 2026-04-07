def log_event(log, t, subject, station, status, waited=0, weight=None, recipe=None):
    entry = {"t": t, "sku": subject, "station": station, "status": status, "waited": waited}
    if weight is not None:
        entry["weight"] = weight
    if recipe is not None:
        entry["recipe"] = recipe
    log.append(entry)
