# Пакет `db`

Пакет `db` — это набор типобезопасных обёрток, сгенерированных **sqlc**, которые связывают Go‑код с SQL‑запросами PostgreSQL, позволяя вызывать базу данных как обычные функции и получать структурированные результаты.

---

## Базовые функции

### New

| **Имя** | **Параметры** | **Описание**                                                    | **Возвращает** |
| ------- | ------------- | --------------------------------------------------------------- | -------------- |
| `New`   | `db DBTX`     | Создаёт экземпляр `*Queries`, привязанный к пулу/соединению БД. | `*Queries`     |

#### Пример

```go
q := db.New(conn)
```

### WithTx

| **Имя**  | **Параметры** | **Описание**                                                                           | **Возвращает** |
| -------- | ------------- | -------------------------------------------------------------------------------------- | -------------- |
| `WithTx` | `tx pgx.Tx`   | Создаёт новую оболочку `*Queries`, выполняющую запросы в рамках переданной транзакции. | `*Queries`     |

#### Пример

```go
qTx := q.WithTx(tx)
```

---

## Boards

### CreateBoard

| **Имя**       | **Параметры**                                                               | **Описание**                                               | **Возвращает**   |
| ------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------- |
| `CreateBoard` | `ctx context.Context`, `arg CreateBoardParams {Name string; OwnerID int32}` | Добавляет новую доску и сразу возвращает созданную запись. | `(Board, error)` |

#### Пример

```go
board, err := q.CreateBoard(ctx, db.CreateBoardParams{
    Name: "Project X", OwnerID: 1,
})
```

### DeleteBoard

| Имя           | Параметры         | Описание             | Возвращает |
| ------------- | ----------------- | -------------------- | ---------- |
| `DeleteBoard` | `ctx`, `id int32` | Удаляет доску по ID. | `error`    |

#### Пример

```go
err := q.DeleteBoard(ctx, 3)
```

### GetBoardByID

| Имя            | Параметры         | Описание                | Возвращает       |
| -------------- | ----------------- | ----------------------- | ---------------- |
| `GetBoardByID` | `ctx`, `id int32` | Возвращает доску по ID. | `(Board, error)` |

#### Пример

```go
board, err := q.GetBoardByID(ctx, 1)
```

### ListBoards

| Имя          | Параметры | Описание                              | Возвращает         |
| ------------ | --------- | ------------------------------------- | ------------------ |
| `ListBoards` | `ctx`     | Список **всех** досок (админ‑запрос). | `([]Board, error)` |

#### Пример

```go
boards, _ := q.ListBoards(ctx)
```

### ListBoardsByMember

| Имя                  | Параметры             | Описание                                          | Возвращает         |
| -------------------- | --------------------- | ------------------------------------------------- | ------------------ |
| `ListBoardsByMember` | `ctx`, `userID int32` | Доски, в которых пользователь состоит участником. | `([]Board, error)` |

#### Пример

```go
myBoards, _ := q.ListBoardsByMember(ctx, userID)
```

### UpdateBoard

| Имя           | Параметры                                              | Описание               | Возвращает       |
| ------------- | ------------------------------------------------------ | ---------------------- | ---------------- |
| `UpdateBoard` | `ctx`, `arg UpdateBoardParams {ID int32; Name string}` | Переименовывает доску. | `(Board, error)` |

#### Пример

```go
updated, _ := q.UpdateBoard(ctx, db.UpdateBoardParams{ID: 1, Name: "Renamed"})
```

---

## Board Members

### AddBoardMember

| Имя              | Параметры                                                              | Описание                     | Возвращает             |
| ---------------- | ---------------------------------------------------------------------- | ---------------------------- | ---------------------- |
| `AddBoardMember` | `ctx`, `arg AddBoardMemberParams {BoardID, UserID int32; Role string}` | Добавляет участника к доске. | `(BoardMember, error)` |

#### Пример

```go
_, err := q.AddBoardMember(ctx, db.AddBoardMemberParams{
    BoardID: 1, UserID: 2, Role: "member",
})
```

### DeleteBoardMember

| Имя                 | Параметры                            | Описание                    | Возвращает |
| ------------------- | ------------------------------------ | --------------------------- | ---------- |
| `DeleteBoardMember` | `ctx`, `arg {BoardID, UserID int32}` | Удаляет участника из доски. | `error`    |

#### Пример

```go
_ = q.DeleteBoardMember(ctx, db.DeleteBoardMemberParams{BoardID: 1, UserID: 2})
```

### GetBoardMember

| Имя              | Параметры                            | Описание                            | Возвращает             |
| ---------------- | ------------------------------------ | ----------------------------------- | ---------------------- |
| `GetBoardMember` | `ctx`, `arg {BoardID, UserID int32}` | Получает данные участника на доске. | `(BoardMember, error)` |

#### Пример

```go
bm, _ := q.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: 1, UserID: 2})
```

### ListBoardMembers

| Имя                | Параметры              | Описание                                    | Возвращает                       |
| ------------------ | ---------------------- | ------------------------------------------- | -------------------------------- |
| `ListBoardMembers` | `ctx`, `boardID int32` | Список участников доски с именами и ролями. | `([]ListBoardMembersRow, error)` |

#### Пример

```go
members, _ := q.ListBoardMembers(ctx, 1)
```

### ListBoardsByUser

| Имя                | Параметры             | Описание                                                   | Возвращает                       |
| ------------------ | --------------------- | ---------------------------------------------------------- | -------------------------------- |
| `ListBoardsByUser` | `ctx`, `userID int32` | Доски, доступные конкретному пользователю (по membership). | `([]ListBoardsByUserRow, error)` |

#### Пример

```go
boards, _ := q.ListBoardsByUser(ctx, userID)
```

### UpdateBoardMemberRole

| Имя                     | Параметры                                         | Описание                              | Возвращает             |
| ----------------------- | ------------------------------------------------- | ------------------------------------- | ---------------------- |
| `UpdateBoardMemberRole` | `ctx`, `arg {BoardID, UserID int32; Role string}` | Меняет роль участника (owner/member). | `(BoardMember, error)` |

#### Пример

```go
_, _ = q.UpdateBoardMemberRole(ctx, db.UpdateBoardMemberRoleParams{
    BoardID: 1, UserID: 2, Role: "owner",
})
```

---

## Lists

### CreateList

| Имя          | Параметры                                                  | Описание                 | Возвращает      |
| ------------ | ---------------------------------------------------------- | ------------------------ | --------------- |
| `CreateList` | `ctx`, `arg {BoardID int32; Title string; Position int32}` | Создаёт колонку в доске. | `(List, error)` |

#### Пример

```go
list, _ := q.CreateList(ctx, db.CreateListParams{
    BoardID: 1, Title: "To Do", Position: 1,
})
```

### DecListPosAfter

| Имя               | Параметры                                    | Описание                                                            | Возвращает |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| `DecListPosAfter` | `ctx`, `arg {BoardID int32; Position int32}` | Декрементирует `position` всех списков **после** указанной позиции. | `error`    |

#### Пример

```go
_ = q.DecListPosAfter(ctx, db.DecListPosAfterParams{BoardID: 1, Position: 3})
```

### IncListPosAfter

| Имя               | Параметры                                    | Описание                                                         | Возвращает |
| ----------------- | -------------------------------------------- | ---------------------------------------------------------------- | ---------- |
| `IncListPosAfter` | `ctx`, `arg {BoardID int32; Position int32}` | Инкрементирует `position` всех списков **от** указанной позиции. | `error`    |

#### Пример

```go
_ = q.IncListPosAfter(ctx, db.IncListPosAfterParams{BoardID: 1, Position: 2})
```

### DeleteList

| Имя          | Параметры         | Описание         | Возвращает |
| ------------ | ----------------- | ---------------- | ---------- |
| `DeleteList` | `ctx`, `id int32` | Удаляет колонку. | `error`    |

#### Пример

```go
_ = q.DeleteList(ctx, list.ID)
```

### GetListByID

| Имя           | Параметры         | Описание               | Возвращает      |
| ------------- | ----------------- | ---------------------- | --------------- |
| `GetListByID` | `ctx`, `id int32` | Находит колонку по ID. | `(List, error)` |

#### Пример

```go
list, _ := q.GetListByID(ctx, 10)
```

### ListListsByBoard

| Имя                | Параметры              | Описание                                                  | Возвращает        |
| ------------------ | ---------------------- | --------------------------------------------------------- | ----------------- |
| `ListListsByBoard` | `ctx`, `boardID int32` | Все колонки конкретной доски, отсортированные по позиции. | `([]List, error)` |

#### Пример

```go
lists, _ := q.ListListsByBoard(ctx, 1)
```

### UpdateList

| Имя          | Параметры                                             | Описание                            | Возвращает      |
| ------------ | ----------------------------------------------------- | ----------------------------------- | --------------- |
| `UpdateList` | `ctx`, `arg {ID int32; Title string; Position int32}` | Обновляет название/позицию колонки. | `(List, error)` |

#### Пример

```go
updated, _ := q.UpdateList(ctx, db.UpdateListParams{
    ID: 10, Title: "Done", Position: 2,
})
```

---

## Cards

### CreateCard

| Имя          | Параметры                                                                          | Описание                   | Возвращает      |
| ------------ | ---------------------------------------------------------------------------------- | -------------------------- | --------------- |
| `CreateCard` | `ctx`, `arg {ListID int32; Title string; Description pgtype.Text; Position int32}` | Создаёт карточку в списке. | `(Card, error)` |

#### Пример

```go
card, _ := q.CreateCard(ctx, db.CreateCardParams{
    ListID: 10, Title: "Implement API", Description: pgtype.Text{String: "", Valid: false}, Position: 1,
})
```

### DecCardPosAfter

| Имя               | Параметры                                   | Описание                                                             | Возвращает |
| ----------------- | ------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| `DecCardPosAfter` | `ctx`, `arg {ListID int32; Position int32}` | Декрементирует `position` всех карточек **после** указанной позиции. | `error`    |

#### Пример

```go
_ = q.DecCardPosAfter(ctx, db.DecCardPosAfterParams{ListID: 10, Position: 4})
```

### IncCardPosAfter

| Имя               | Параметры                                   | Описание                                                          | Возвращает |
| ----------------- | ------------------------------------------- | ----------------------------------------------------------------- | ---------- |
| `IncCardPosAfter` | `ctx`, `arg {ListID int32; Position int32}` | Инкрементирует `position` всех карточек **от** указанной позиции. | `error`    |

#### Пример

```go
_ = q.IncCardPosAfter(ctx, db.IncCardPosAfterParams{ListID: 10, Position: 2})
```

### DeleteCard

| Имя          | Параметры         | Описание          | Возвращает |
| ------------ | ----------------- | ----------------- | ---------- |
| `DeleteCard` | `ctx`, `id int32` | Удаляет карточку. | `error`    |

#### Пример

```go
_ = q.DeleteCard(ctx, card.ID)
```

### GetCardByID

| Имя           | Параметры         | Описание                 | Возвращает      |
| ------------- | ----------------- | ------------------------ | --------------- |
| `GetCardByID` | `ctx`, `id int32` | Получает карточку по ID. | `(Card, error)` |

#### Пример

```go
card, _ = q.GetCardByID(ctx, 101)
```

### ListCardsByList

| Имя               | Параметры             | Описание                               | Возвращает        |
| ----------------- | --------------------- | -------------------------------------- | ----------------- |
| `ListCardsByList` | `ctx`, `listID int32` | Все карточки списка в порядке позиции. | `([]Card, error)` |

#### Пример

```go
cards, _ := q.ListCardsByList(ctx, 10)
```

### UpdateCard

| Имя          | Параметры                                                                              | Описание                                        | Возвращает      |
| ------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------- |
| `UpdateCard` | `ctx`, `arg {ID, ListID int32; Title string; Description pgtype.Text; Position int32}` | Обновляет контент, позицию или список карточки. | `(Card, error)` |

#### Пример

```go
updated, _ := q.UpdateCard(ctx, db.UpdateCardParams{
    ID: card.ID, ListID: 11, Title: "Done", Description: card.Description, Position: 1,
})
```

---

## Users

### CreateUser

| Имя          | Параметры                                       | Описание                     | Возвращает      |
| ------------ | ----------------------------------------------- | ---------------------------- | --------------- |
| `CreateUser` | `ctx`, `arg {Name, Email, PasswordHash string}` | Создаёт нового пользователя. | `(User, error)` |

#### Пример

```go
u, _ := q.CreateUser(ctx, db.CreateUserParams{
    Name: "Alice", Email: "alice@example.com", PasswordHash: pwd,
})
```

### DeleteUser

| Имя          | Параметры         | Описание              | Возвращает |
| ------------ | ----------------- | --------------------- | ---------- |
| `DeleteUser` | `ctx`, `id int32` | Удаляет пользователя. | `error`    |

#### Пример

```go
_ = q.DeleteUser(ctx, u.ID)
```

### GetUserByEmail

| Имя              | Параметры             | Описание                       | Возвращает      |
| ---------------- | --------------------- | ------------------------------ | --------------- |
| `GetUserByEmail` | `ctx`, `email string` | Находит пользователя по email. | `(User, error)` |

#### Пример

```go
user, _ := q.GetUserByEmail(ctx, "alice@example.com")
```

### GetUserByID

| Имя           | Параметры         | Описание                     | Возвращает      |
| ------------- | ----------------- | ---------------------------- | --------------- |
| `GetUserByID` | `ctx`, `id int32` | Получает пользователя по ID. | `(User, error)` |

#### Пример

```go
user, _ := q.GetUserByID(ctx, 1)
```

### UpdatePasswordHash

| Имя                  | Параметры                                    | Описание                          | Возвращает      |
| -------------------- | -------------------------------------------- | --------------------------------- | --------------- |
| `UpdatePasswordHash` | `ctx`, `arg {ID int32; PasswordHash string}` | Изменяет хеш пароля пользователя. | `(User, error)` |

#### Пример

```go
_, _ = q.UpdatePasswordHash(ctx, db.UpdatePasswordHashParams{
    ID: 1, PasswordHash: newHash,
})
```

### UpdateUser

| Имя          | Параметры                                   | Описание                            | Возвращает      |
| ------------ | ------------------------------------------- | ----------------------------------- | --------------- |
| `UpdateUser` | `ctx`, `arg {ID int32; Name, Email string}` | Обновляет имя и email пользователя. | `(User, error)` |

#### Пример

```go
usr, _ := q.UpdateUser(ctx, db.UpdateUserParams{
    ID: 1, Name: "Alice B.", Email: "alice.b@example.com",
})
```
