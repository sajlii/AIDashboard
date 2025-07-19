#!/usr/bin/env python
# coding: utf-8

# In[ ]:


# STEP 1: Install & Import Libraries
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report

# ML Models
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import MultinomialNB

import warnings
warnings.filterwarnings('ignore')



# In[ ]:


# STEP 2: Upload and Load Dataset
# from google.colab import files
# uploaded = files.upload()

# Replace the file name if different
# STEP 2: Load Dataset
df = pd.read_csv("../data/dashboard_dataset_cleaned.csv")  # Adjust if your file is in a different path
df.head()



# In[ ]:


# STEP 3: Clean and Preprocess

df = df.dropna(subset=['incident_type', 'description', 'city'])

df[['nkill', 'nwound', 'propvalue']] = df[['nkill', 'nwound', 'propvalue']].fillna(0)

df['incident_type'] = df['incident_type'].apply(lambda x: 'chemical' if 'chemical' in x.lower() else 'fire_explosion')

label_encoder = LabelEncoder()
df['target'] = label_encoder.fit_transform(df['incident_type'])  # chemical=0, fire=1



# In[ ]:


# STEP 4: Feature Engineering

# Text features from description
tfidf = TfidfVectorizer(max_features=500)
description_features = tfidf.fit_transform(df['description'])

# Encode city
df['city_encoded'] = LabelEncoder().fit_transform(df['city'])

# Final feature matrix (text + numeric)
features = np.hstack([
    description_features.toarray(),
    df[['nkill', 'nwound', 'propvalue', 'city_encoded']].values
])

labels = df['target']


# In[ ]:


# STEP 5: Split Data
X_train, X_test, y_train, y_test = train_test_split(features, labels, test_size=0.2, random_state=42)



# In[ ]:


# STEP 6: Train Models (Skipping NB on numeric data)

models = {
    "Logistic Regression": LogisticRegression(),
    "Decision Tree": DecisionTreeClassifier(),
    "Random Forest": RandomForestClassifier(),
    "Support Vector Machine": SVC(),
    # "Naive Bayes": MultinomialNB()  # excluded from mixed data
}

results = {}

for name, model in models.items():
    try:
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        results[name] = acc
        print(f"\n{name}")
        print("Accuracy:", acc)
        print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))
    except ValueError as e:
        print(f"{name} failed: {e}")



# In[ ]:


# STEP 7: Optional — Naive Bayes on Text Only
X_text_train, X_text_test, y_text_train, y_text_test = train_test_split(description_features, labels, test_size=0.2, random_state=42)

nb = MultinomialNB()
nb.fit(X_text_train, y_text_train)
y_pred_nb = nb.predict(X_text_test)

acc_nb = accuracy_score(y_text_test, y_pred_nb)
print("\nNaive Bayes (TF-IDF only)")
print("Accuracy:", acc_nb)
print(classification_report(y_text_test, y_pred_nb, target_names=label_encoder.classes_))

results["Naive Bayes (text only)"] = acc_nb



# In[ ]:


# STEP 8: Plot Accuracy Comparison
plt.figure(figsize=(10,5))
sns.barplot(x=list(results.keys()), y=list(results.values()))
plt.title("Model Accuracy Comparison")
plt.ylabel("Accuracy")
plt.xticks(rotation=30)
plt.show()


import pickle

with open("../models/incident_classifier_model.pkl", "wb") as f:
    pickle.dump(models["Random Forest"], f)

with open("../models/tfidf_vectorizer.pkl", "wb") as f:
    pickle.dump(tfidf, f)

with open("../models/label_encoder.pkl", "wb") as f:
    pickle.dump(label_encoder, f)


