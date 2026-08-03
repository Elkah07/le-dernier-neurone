# Valider les questions dans VS Code

Chaque fichier JSON de ce dossier correspond à un thème du jeu. Les questions sont classées par ordre alphabétique pour faciliter leur relecture.

Pour chaque question, modifie uniquement la valeur du champ `validation` :

- `"a_valider"` : tu ne l'as pas encore vérifiée ;
- `"validee"` : tu veux la conserver ;
- `"rejetee"` : elle ne doit plus apparaître dans le jeu.

Après tes modifications, ouvre le terminal de VS Code et lance :

```bash
npm run questions:build
```

Cette commande reconstruit automatiquement `data/question-bank.json`. Les questions marquées `rejetee` sont exclues. Tu peux aussi supprimer complètement une question de son fichier thématique si tu préfères.

Ne modifie pas directement `data/question-bank.json` : il est généré automatiquement à partir des fichiers de ce dossier.
