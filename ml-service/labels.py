import re
import typing

LABEL_UNKNOWN = "Unclassified"

CANONICAL_LABELS = [
    "Garbage and Solid Waste",
    "Water Supply",
    "Storm Water Drainage",
    "Sewage and Sanitation",
    "Roads and Potholes",
    "Street Lights and Electrical",
    "Parks and Environment",
    "Public Health",
    "Traffic and Public Safety",
    "Property and Tax",
    "Town Planning and Infrastructure",
    "Other Public Services",
    "Others",
]

_ALIAS_LABELS = {
    "advertisement": "Other Public Services",
    "bbmp election branch": "Other Public Services",
    "call center": "Other Public Services",
    "information technology": "Other Public Services",
    "education": "Other Public Services",
    "welfare schemes": "Other Public Services",
    "indira canteen": "Other Public Services",
    "electrical": "Street Lights and Electrical",
    "optical fiber cables (ofc)": "Street Lights and Electrical",
    "markets": "Other Public Services",
    "parks and play grounds": "Parks and Environment",
    "forest": "Parks and Environment",
    "lakes": "Parks and Environment",
    "plastic": "Garbage and Solid Waste",
    "property tax services": "Property and Tax",
    "e khata / khata services": "Property and Tax",
    "revenue department": "Property and Tax",
    "road infrastructure": "Roads and Potholes",
    "road maintenance(engg)": "Roads and Potholes",
    "sanitation": "Sewage and Sanitation",
    "health dept": "Public Health",
    "corona covid19": "Public Health",
    "corona covid-19": "Public Health",
    "solid waste (garbage) related": "Garbage and Solid Waste",
    "storm water drain(swd)": "Storm Water Drainage",
    "storm water drain (swd)": "Storm Water Drainage",
    "storm  water drain(swd)": "Storm Water Drainage",
    "water crisis": "Water Supply",
    "town planning": "Town Planning and Infrastructure",
    "estate": "Town Planning and Infrastructure",
    "projects central": "Town Planning and Infrastructure",
    "traffic engineer cell (tec)": "Traffic and Public Safety",
    "veterinary": "Public Health",
    "others": "Others",
}


def normalize_label_key(value: typing.Optional[str]) -> str:
    text = "" if value is None else str(value)
    text = text.strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text


_CANONICAL_BY_KEY = {normalize_label_key(label): label for label in CANONICAL_LABELS}


def standardize_label(value: typing.Optional[str]) -> str:
    key = normalize_label_key(value)
    if not key:
        return LABEL_UNKNOWN
    if key in _ALIAS_LABELS:
        return _ALIAS_LABELS[key]
    return _CANONICAL_BY_KEY.get(key, LABEL_UNKNOWN)


def standardize_labels(values: typing.Iterable[typing.Optional[str]]) -> typing.List[str]:
    return [standardize_label(value) for value in values]
