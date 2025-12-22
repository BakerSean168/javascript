/**
 * 将 JSON 数据从二级标题 (##) 开始渲染为指定的 Markdown 结构
 * @param {string} jsonString - JSON 字符串
 * @returns {string} - 格式化后的 Markdown
 */
function renderJsonToMarkdownFromH2(jsonString) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return "JSON 解析错误: " + e.message;
  }

  let md = "";

  // 1. 忽略 archiveTitle (H1)

  /**
   * 递归渲染函数
   * @param {Array} items - 当前层级的数据数组
   * @param {Number} depth - 当前深度 (起始为 2)
   * Depth 2 -> ## H2
   * Depth 3 -> ### H3
   * Depth 4 -> 1. **Title** + * Description
   */
  function renderItems(items, depth) {
    if (!items || !Array.isArray(items)) return;

    items.forEach((item, index) => {
      const title = item.title;
      const desc = item.description;

      // --- 根据深度决定渲染格式 ---
      
      if (depth === 2) {
        // Level 2: H2 标题 (例如：水的必要性)
        md += `## ${title}\n\n`;
        // 在 H2 下如果存在描述，则渲染描述
        if (desc) md += `${desc}\n\n`;
      } 
      else if (depth === 3) {
        // Level 3: H3 标题 (例如：人体含水量)
        md += `### ${title}\n\n`;
        if (desc) md += `${desc}\n\n`;
      } 
      else {
        // Level 4+: 列表形式 (如果 JSON 有更深层级，会自动变成列表)
        // 格式：数字加粗标题，下一行用 * 号接描述
        md += `${index + 1}. **${title}**\n`;
        if (desc) {
          md += `* ${desc}\n`; 
        }
        md += `\n`; // 列表项之间的空行
      }

      // 递归处理子项 (进入下一层级)
      if (item.subsections && item.subsections.length > 0) {
        renderItems(item.subsections, depth + 1);
      }
      
      // 分割线逻辑：仅在 H2 大板块结束时添加，且不加在最后一个板块后
      // 这里的 depth === 2 对应 data.content 中的项
      if (depth === 2 && index < items.length - 1) {
        md += `---\n\n`;
      }
    });
  }

  // 开始渲染，初始深度为 2，直接处理 data.content
  if (data.content) {
    renderItems(data.content, 2);
  }

  return md;
}

// ==========================================
// 使用你提供的“饮水知识” JSON 进行测试
// ==========================================
const jsonData = {
  "archiveTitle": "Arm Training Knowledge Document",
  "content": [
    {
      "title": "Anatomy of the Arm",
      "description": "Understanding the muscles of the upper arm (biceps, triceps, forearm) and their functions is crucial for effective training. The biceps brachii, triceps brachii, and forearm muscles work in synergy to facilitate movement and strength.",
      "subsections": [
        {
          "title": "Biceps Brachii",
          "description": "The biceps brachii is the primary elbow flexor and plays a role in supination of the forearm. It consists of two heads: the long head and the short head.",
          "subsections": [
            {
              "title": "Long Head",
              "description": "Originating from the shoulder blade, the long head contributes significantly to overall arm volume and peak."
            },
            {
              "title": "Short Head",
              "description": "Originating from the coracoid process, the short head contributes to arm width and overall biceps mass."
            }
          ]
        },
        {
          "title": "Triceps Brachii",
          "description": "The triceps brachii is the primary elbow extensor and comprises three heads: the long head, lateral head, and medial head.",
          "subsections": [
            {
              "title": "Long Head",
              "description": "Crossing the shoulder joint, the long head contributes to arm size and overall triceps development."
            },
            {
              "title": "Lateral Head",
              "description": "Providing width to the triceps, the lateral head is crucial for achieving a broader, more defined look."
            },
            {
              "title": "Medial Head",
              "description": "Located deep within the triceps, the medial head contributes to overall mass and helps shape the triceps muscle."
            }
          ]
        },
        {
          "title": "Forearm Muscles",
          "description": "The forearm muscles consist of flexors and extensors responsible for wrist and hand movements, as well as grip strength. These muscles are essential for a variety of activities and contribute to overall arm functionality."
        }
      ]
    },
    {
      "title": "Biceps Training Techniques",
      "description": "Effective biceps training involves a variety of exercises and strategies to build and strengthen the biceps brachii.",
      "subsections": [
        {
          "title": "Curling Variations",
          "description": "Different curl types offer unique benefits and target the biceps from various angles.",
          "subsections": [
            {
              "title": "Barbell Curls",
              "description": "A classic exercise for building overall biceps mass and strength."
            },
            {
              "title": "Dumbbell Curls",
              "description": "Allows for greater range of motion and individual arm development, addressing muscle imbalances."
            },
            {
              "title": "Hammer Curls",
              "description": "Targets the brachialis and brachioradialis, adding thickness to the upper arm and improving forearm strength."
            }
          ]
        },
        {
          "title": "Rep Ranges & Sets",
          "description": "Optimal rep ranges and set structures are crucial for achieving specific training goals.",
          "subsections": [
            {
              "title": "Hypertrophy Range",
              "description": "8-12 reps for muscle growth, focusing on time under tension."
            },
            {
              "title": "Strength Range",
              "description": "4-6 reps for increasing strength, utilizing heavier weights."
            }
          ]
        },
        {
          "title": "Progressive Overload",
          "description": "Gradually increasing weight or reps over time is essential for continued muscle growth and strength gains."
        }
      ]
    },
    {
      "title": "Triceps Training Techniques",
      "description": "Effective triceps training involves a variety of exercises and strategies to build and strengthen the triceps brachii.",
      "subsections": [
        {
          "title": "Extension Variations",
          "description": "Different extension types offer unique benefits and target the triceps from various angles.",
          "subsections": [
            {
              "title": "Overhead Extensions",
              "description": "Targets the long head of the triceps, promoting overall muscle development."
            },
            {
              "title": "Pushdowns",
              "description": "A versatile exercise for targeting all three heads of the triceps, allowing for various grip and attachment options."
            },
            {
              "title": "Skullcrushers",
              "description": "Effective for building triceps mass, but requires proper form to prevent injuries."
            }
          ]
        },
        {
          "title": "Rep Ranges & Sets",
          "description": "Optimal rep ranges and set structures are crucial for achieving specific training goals.",
          "subsections": [
            {
              "title": "Hypertrophy Range",
              "description": "8-12 reps for muscle growth, focusing on time under tension."
            },
            {
              "title": "Strength Range",
              "description": "4-6 reps for increasing strength, utilizing heavier weights."
            }
          ]
        },
        {
          "title": "Proper Form & Safety",
          "description": "Maintaining correct form is essential to prevent injuries and maximize training effectiveness."
        }
      ]
    },
    {
      "title": "Forearm Training & Grip Strength",
      "description": "Developing forearm muscles and improving grip strength is crucial for overall arm functionality and performance.",
      "subsections": [
        {
          "title": "Wrist Curls & Reverse Wrist Curls",
          "description": "Target the flexors and extensors of the wrist, improving forearm strength and endurance.",
          "subsections": [
            {
              "title": "Wrist Curl Technique",
              "description": "Focus on controlled movements and full range of motion, emphasizing proper form."
            },
            {
              "title": "Reverse Wrist Curl Technique",
              "description": "Strengthens the forearm extensors, balancing muscle development."
            }
          ]
        },
        {
          "title": "Farmer's Walks",
          "description": "A functional exercise that builds grip strength and overall endurance, simulating real-world activities."
        },
        {
          "title": "Grip Strengthening Tools",
          "description": "Overview of tools like hand grippers and stress balls, providing additional training options."
        }
      ]
    }
  ]
};

console.log(renderJsonToMarkdownFromH2(JSON.stringify(jsonData)));