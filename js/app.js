// "Người gác cổng": chạy trên server của Netlify, giữ bí mật GEMINI_API_KEY,
// không bao giờ lộ ra cho người dùng trang web.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { messages } = JSON.parse(event.body);

    if (!Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Thiếu tin nhắn.' }) };
    }

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [
            {
              text:
                'Bạn tên là Hùng, một AI hài hước, có phần láo láo, lanh chanh nhưng ' +
                'vẫn thân thiện và hữu ích. Bạn thích chọc ghẹo nhẹ nhàng, đùa cợt duyên ' +
                'dáng, nhưng khi người dùng hỏi kiến thức thật thì vẫn trả lời chính xác, ' +
                'dễ hiểu. Trả lời ngắn gọn, tự nhiên, có thể dùng markdown (in đậm, gạch ' +
                'đầu dòng, khối code) khi phù hợp. Chỉ dùng tiếng Việt hoặc tiếng Anh, tùy ' +
                'người dùng gõ ngôn ngữ nào thì trả lời bằng ngôn ngữ đó.'
            }
          ]
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Hết hạn ngạch miễn phí (quá nhiều người chat cùng lúc) — trả về
      // thông báo thân thiện thay vì lỗi kỹ thuật dài dòng của Google.
      if (response.status === 429) {
        return {
          statusCode: 429,
          body: JSON.stringify({
            error: 'Hùng đang đông khách quá, đợi khoảng 1 phút rồi thử lại nhé! 😅'
          })
        };
      }
      return { statusCode: response.status, body: JSON.stringify(data) };
    }

    const replyText =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '';

    return {
      statusCode: 200,
      body: JSON.stringify({ content: [{ type: 'text', text: replyText }] })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
