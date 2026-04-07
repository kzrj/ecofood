def log_event(log, t, subject, station, status, waited=0, weight=None, recipe=None, section=None):
    entry = {"t": t, "sku": subject, "station": station, "status": status, "waited": waited}
    if weight is not None:
        entry["weight"] = weight
    if recipe is not None:
        entry["recipe"] = recipe
    if section is not None:
        entry["section"] = section
    log.append(entry)
