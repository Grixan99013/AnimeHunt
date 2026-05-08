// server/middleware/validate.js
// Централизованная валидация входных данных через joi
const Joi = require("joi");

/**
 * Фабрика middleware: валидирует req.body по схеме Joi.
 * При ошибке возвращает 400 с понятным сообщением.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,       // показать все ошибки сразу
      stripUnknown: true,      // убрать лишние поля
      convert: true,           // мягкое приведение типов
    });
    if (error) {
      const message = error.details.map(d => d.message).join("; ");
      return res.status(400).json({ error: message });
    }
    req.body = value;
    next();
  };
}

// ── Схемы ────────────────────────────────────────────────────

const ANIME_STATUSES = ["ongoing", "completed", "upcoming", "cancelled"];
const ANIME_TYPES    = ["tv", "movie", "ova", "ona", "special", "music"];
const AGE_RATINGS    = ["G", "PG", "PG-13", "R-17", "R+", null];
const CHAR_ROLES     = ["main", "supporting", "extra"];

// Регистрация
const registerSchema = Joi.object({
  username: Joi.string().trim().min(3).max(30)
    .pattern(/^[a-zA-Z0-9_а-яА-ЯёЁ]+$/)
    .required()
    .messages({
      "string.pattern.base": "Имя пользователя может содержать только буквы, цифры и _",
      "string.min": "Имя пользователя должно быть не менее 3 символов",
      "string.max": "Имя пользователя не должно превышать 30 символов",
    }),
  email: Joi.string().trim().email({ tlds: { allow: false } }).max(254).required()
    .messages({ "string.email": "Введите корректный email" }),
  password: Joi.string().min(6).max(128).required()
    .messages({ "string.min": "Пароль должен быть не менее 6 символов" }),
});

// Вход
const loginSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(1).required(),
});

// Смена пароля
const changePasswordSchema = Joi.object({
  current_password: Joi.string().min(1).required().messages({ "any.required": "Укажите текущий пароль" }),
  new_password: Joi.string().min(6).max(128).required()
    .messages({ "string.min": "Новый пароль должен быть не менее 6 символов" }),
});

// Комментарий
const commentSchema = Joi.object({
  body: Joi.string().trim().max(5000).allow("", null).optional(),
  parent_id: Joi.number().integer().positive().allow(null).optional(),
  image_url: Joi.string().max(2 * 1024 * 1024).allow("", null).optional(), // base64 до ~1.5МБ
}).or("body", "image_url"); // хотя бы одно из двух

// Рецензия
const reviewSchema = Joi.object({
  score: Joi.number().integer().min(1).max(10).required()
    .messages({ "number.min": "Оценка от 1 до 10", "number.max": "Оценка от 1 до 10" }),
  title: Joi.string().trim().min(1).max(200).required()
    .messages({ "string.min": "Укажите заголовок" }),
  body: Joi.string().trim().min(100).max(50000).required()
    .messages({ "string.min": "Рецензия должна быть не менее 100 символов" }),
});

// Оценка аниме
const ratingSchema = Joi.object({
  score: Joi.number().integer().min(1).max(10).required()
    .messages({ "any.required": "Укажите оценку", "number.min": "Оценка от 1 до 10" }),
});

// Добавление/редактирование аниме
const animeBodySchema = Joi.object({
  title:       Joi.string().trim().min(1).max(500).required().messages({ "string.min": "Укажите название" }),
  title_en:    Joi.string().trim().max(500).allow("", null).optional(),
  title_jp:    Joi.string().trim().max(500).allow("", null).optional(),
  synopsis:    Joi.string().trim().max(10000).allow("", null).optional(),
  poster_url:  Joi.string().trim().max(1000).allow("", null).optional(),
  banner_url:  Joi.string().trim().max(1000).allow("", null).optional(),
  status:      Joi.string().valid(...ANIME_STATUSES).default("ongoing"),
  type:        Joi.string().valid(...ANIME_TYPES).default("tv"),
  episodes:    Joi.number().integer().min(1).max(9999).allow(null).optional(),
  duration_min:Joi.number().integer().min(1).max(1440).allow(null).optional(),
  aired_from:  Joi.string().isoDate().allow("", null).optional(),
  aired_to:    Joi.string().isoDate().allow("", null).optional(),
  studio_id:   Joi.number().integer().positive().allow(null, "").optional(),
  studio_new_name: Joi.string().trim().max(200).allow("", null).optional(),
  is_new:      Joi.boolean().optional(),
  season_num:  Joi.number().integer().min(1).max(99).allow(null, "").optional(),
  age_rating:  Joi.string().valid(...AGE_RATINGS.filter(Boolean)).allow(null, "").optional(),
  genre_ids:   Joi.array().items(Joi.number().integer().positive()).optional(),
  themes:      Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(100)),
    Joi.string().max(2000)
  ).optional(),
  series:      Joi.object({
    mode:             Joi.string().valid("none", "existing", "new").required(),
    series_id:        Joi.number().integer().positive().allow(null).optional(),
    series_title:     Joi.string().trim().max(300).allow("", null).optional(),
    series_description: Joi.string().trim().max(2000).allow("", null).optional(),
    sort_order:       Joi.number().integer().allow(null).optional(),
  }).allow(null).optional(),
});

// Персонаж (новый или привязка)
const characterBodySchema = Joi.object({
  mode:         Joi.string().valid("new", "link").default("new"),
  character_id: Joi.number().integer().positive().when("mode", { is: "link", then: Joi.required() }),
  role_in_anime:Joi.string().valid(...CHAR_ROLES).default("supporting"),
  name:         Joi.string().trim().min(1).max(300).when("mode", { is: "new", then: Joi.required() }),
  name_jp:      Joi.string().trim().max(300).allow("", null).optional(),
  role:         Joi.string().valid(...CHAR_ROLES).default("supporting"),
  description:  Joi.string().trim().max(10000).allow("", null).optional(),
  image_url:    Joi.string().trim().max(1000).allow("", null).optional(),
  age:          Joi.string().trim().max(50).allow("", null).optional(),
  gender:       Joi.string().trim().max(50).allow("", null).optional(),
  abilities:    Joi.string().trim().max(5000).allow("", null).optional(),
});

// Жанр
const genreSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({ "string.min": "Укажите название жанра" }),
});

// Студия
const studioSchema = Joi.object({
  name:    Joi.string().trim().min(1).max(200).required().messages({ "string.min": "Укажите название студии" }),
  country: Joi.string().trim().max(100).allow("", null).optional(),
});

// Смена роли пользователя
const userRoleSchema = Joi.object({
  role_id: Joi.number().integer().valid(1, 2, 3).required()
    .messages({ "any.only": "Допустимые роли: 1 (admin), 2 (moderator), 3 (user)" }),
});

module.exports = {
  validate,
  schemas: {
    register:    registerSchema,
    login:       loginSchema,
    changePassword: changePasswordSchema,
    comment:     commentSchema,
    review:      reviewSchema,
    rating:      ratingSchema,
    animeBody:   animeBodySchema,
    characterBody: characterBodySchema,
    genre:       genreSchema,
    studio:      studioSchema,
    userRole:    userRoleSchema,
  },
};
